import { Router } from "express";
import { OrderStatus, PaymentMethod, Prisma, TransactionItemType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { parseDateRange, toISODate } from "../../utils/date";
import { authenticate, authorizeRoles } from "../../middlewares/auth";

const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(authorizeRoles("admin", "management", "staff"));

const parseItemTypeQuery = (value: string): TransactionItemType | undefined => {
  return Object.values(TransactionItemType).includes(value as TransactionItemType)
    ? (value as TransactionItemType)
    : undefined;
};

const parsePaymentMethodQuery = (value: string): PaymentMethod | undefined => {
  return Object.values(PaymentMethod).includes(value as PaymentMethod) ? (value as PaymentMethod) : undefined;
};

const parseOrderStatusQuery = (value: string): OrderStatus | undefined => {
  return Object.values(OrderStatus).includes(value as OrderStatus) ? (value as OrderStatus) : undefined;
};

const getOrderRangeWhere = (startDate?: string, endDate?: string, itemType?: TransactionItemType): Prisma.OrderWhereInput => {
  const range = parseDateRange(startDate, endDate);
  return {
    deletedAt: null,
    createdAt: {
      gte: range.start,
      lte: range.end,
    },
    ...(itemType ? { items: { some: { itemType } } } : {}),
  };
};

const getExpenseRangeWhere = (startDate?: string, endDate?: string): Prisma.ExpenseWhereInput => {
  const range = parseDateRange(startDate, endDate);
  return {
    deletedAt: null,
    date: {
      gte: range.start,
      lte: range.end,
    },
  };
};

reportsRouter.get(
  "/ringkasan",
  asyncHandler(async (req, res) => {
    const startDate = String(req.query.startDate ?? "");
    const endDate = String(req.query.endDate ?? "");
    const itemType = parseItemTypeQuery(String(req.query.itemType ?? ""));
    const orderWhere = getOrderRangeWhere(startDate, endDate, itemType);
    const expenseWhere = getExpenseRangeWhere(startDate, endDate);

    const [expenses, pendingOrders, customerCount, orders, filteredItems] = await Promise.all([
      prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true },
      }),
      prisma.order.count({
        where: {
          ...orderWhere,
          status: { in: [OrderStatus.menunggu_desain, OrderStatus.proses_cetak, OrderStatus.finishing] },
        },
      }),
      prisma.customer.count({ where: { deletedAt: null } }),
      itemType
        ? Promise.resolve([])
        : prisma.order.findMany({
            where: orderWhere,
            select: { id: true, total: true },
          }),
      itemType
        ? prisma.orderItem.findMany({
            where: {
              itemType,
              order: getOrderRangeWhere(startDate, endDate),
            },
            select: {
              orderId: true,
              subtotal: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const totalRevenue = itemType
      ? filteredItems.reduce((sum, item) => sum + item.subtotal, 0)
      : orders.reduce((sum, order) => sum + order.total, 0);
    const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalOrders = itemType ? new Set(filteredItems.map((item) => item.orderId)).size : orders.length;

    sendSuccess(res, {
      totalRevenue,
      totalExpense,
      totalProfit: totalRevenue - totalExpense,
      totalOrders,
      pendingOrders,
      totalCustomers: customerCount,
    });
  }),
);

reportsRouter.get(
  "/penjualan-harian",
  asyncHandler(async (req, res) => {
    const startDate = String(req.query.startDate ?? "");
    const endDate = String(req.query.endDate ?? "");
    const itemType = parseItemTypeQuery(String(req.query.itemType ?? ""));
    const grouped = new Map<string, { date: string; revenue: number; orders: number; orderIds: Set<string> }>();

    if (!itemType) {
      const orders = await prisma.order.findMany({
        where: getOrderRangeWhere(startDate, endDate),
        select: {
          id: true,
          createdAt: true,
          total: true,
        },
        orderBy: { createdAt: "asc" },
      });

      for (const order of orders) {
        const key = toISODate(order.createdAt);
        const current = grouped.get(key) ?? { date: key, revenue: 0, orders: 0, orderIds: new Set<string>() };
        current.revenue += order.total;
        current.orderIds.add(order.id);
        current.orders = current.orderIds.size;
        grouped.set(key, current);
      }
    } else {
      const items = await prisma.orderItem.findMany({
        where: {
          itemType,
          order: getOrderRangeWhere(startDate, endDate),
        },
        select: {
          orderId: true,
          subtotal: true,
          order: {
            select: {
              createdAt: true,
            },
          },
        },
      });

      for (const item of items) {
        const key = toISODate(item.order.createdAt);
        const current = grouped.get(key) ?? { date: key, revenue: 0, orders: 0, orderIds: new Set<string>() };
        current.revenue += item.subtotal;
        current.orderIds.add(item.orderId);
        current.orders = current.orderIds.size;
        grouped.set(key, current);
      }
    }

    sendSuccess(
      res,
      [...grouped.values()].map(({ orderIds: _orderIds, ...rest }) => rest),
    );
  }),
);

reportsRouter.get(
  "/tabel-transaksi",
  asyncHandler(async (req, res) => {
    const startDate = String(req.query.startDate ?? "");
    const endDate = String(req.query.endDate ?? "");
    const itemType = parseItemTypeQuery(String(req.query.itemType ?? ""));
    const paymentMethod = parsePaymentMethodQuery(String(req.query.paymentMethod ?? ""));
    const status = parseOrderStatusQuery(String(req.query.status ?? ""));
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...getOrderRangeWhere(startDate, endDate, itemType),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(status ? { status } : {}),
    };
    const itemWhere: Prisma.OrderItemWhereInput = itemType ? { itemType } : {};

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          customerName: true,
          total: true,
          paymentMethod: true,
          status: true,
          items: {
            where: itemWhere,
            orderBy: { createdAt: "asc" },
            select: {
              itemLabel: true,
              productName: true,
              variantName: true,
              quantity: true,
              unitPrice: true,
            },
          },
        },
      }),
    ]);

    const data = orders.map((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toISOString(),
      customerName: order.customerName,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
      items: order.items.map((item) => {
        const fallbackLabel =
          item.variantName && item.variantName.trim().length > 0
            ? `${item.productName} - ${item.variantName}`
            : item.productName;

        return {
          itemLabel: item.itemLabel?.trim() ? item.itemLabel : fallbackLabel,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        };
      }),
    }));

    sendSuccess(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }),
);

reportsRouter.get(
  "/produk-terlaris",
  asyncHandler(async (req, res) => {
    const startDate = String(req.query.startDate ?? "");
    const endDate = String(req.query.endDate ?? "");
    const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 50);
    const itemType = parseItemTypeQuery(String(req.query.itemType ?? ""));

    const items = await prisma.orderItem.findMany({
      where: {
        ...(itemType ? { itemType } : {}),
        order: getOrderRangeWhere(startDate, endDate),
      },
      select: {
        productName: true,
        quantity: true,
        subtotal: true,
      },
    });

    const grouped = new Map<string, { name: string; sales: number; revenue: number }>();
    for (const item of items) {
      const key = item.productName;
      const current = grouped.get(key) ?? { name: key, sales: 0, revenue: 0 };
      current.sales += item.quantity;
      current.revenue += item.subtotal;
      grouped.set(key, current);
    }

    const sorted = [...grouped.values()].sort((a, b) => b.sales - a.sales).slice(0, limit);
    sendSuccess(res, sorted);
  }),
);

reportsRouter.get(
  "/metode-pembayaran",
  asyncHandler(async (req, res) => {
    const startDate = String(req.query.startDate ?? "");
    const endDate = String(req.query.endDate ?? "");
    const itemType = parseItemTypeQuery(String(req.query.itemType ?? ""));

    const grouped = new Map<string, { method: string; value: number }>();
    if (!itemType) {
      const orders = await prisma.order.findMany({
        where: getOrderRangeWhere(startDate, endDate),
        select: {
          paymentMethod: true,
          total: true,
        },
      });

      for (const order of orders) {
        const key = order.paymentMethod;
        const current = grouped.get(key) ?? { method: key, value: 0 };
        current.value += order.total;
        grouped.set(key, current);
      }
    } else {
      const items = await prisma.orderItem.findMany({
        where: {
          itemType,
          order: getOrderRangeWhere(startDate, endDate),
        },
        select: {
          subtotal: true,
          order: {
            select: {
              paymentMethod: true,
            },
          },
        },
      });

      for (const item of items) {
        const key = item.order.paymentMethod;
        const current = grouped.get(key) ?? { method: key, value: 0 };
        current.value += item.subtotal;
        grouped.set(key, current);
      }
    }

    sendSuccess(res, [...grouped.values()]);
  }),
);

reportsRouter.get(
  "/pengeluaran-per-kategori",
  asyncHandler(async (req, res) => {
    const startDate = String(req.query.startDate ?? "");
    const endDate = String(req.query.endDate ?? "");
    const expenses = await prisma.expense.findMany({
      where: getExpenseRangeWhere(startDate, endDate),
      select: {
        category: true,
        amount: true,
      },
    });

    const grouped = new Map<string, { category: string; value: number }>();
    for (const expense of expenses) {
      const key = expense.category;
      const current = grouped.get(key) ?? { category: key, value: 0 };
      current.value += expense.amount;
      grouped.set(key, current);
    }

    sendSuccess(res, [...grouped.values()]);
  }),
);

export { reportsRouter };
