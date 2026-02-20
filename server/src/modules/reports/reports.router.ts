import { Router } from "express";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { parseDateRange, toISODate } from "../../utils/date";
import { authenticate, authorizeRoles } from "../../middlewares/auth";

const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(authorizeRoles("owner", "admin"));

const getOrderRangeWhere = (startDate?: string, endDate?: string): Prisma.OrderWhereInput => {
  const range = parseDateRange(startDate, endDate);
  return {
    deletedAt: null,
    createdAt: {
      gte: range.start,
      lte: range.end,
    },
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
    const orderWhere = getOrderRangeWhere(startDate, endDate);
    const expenseWhere = getExpenseRangeWhere(startDate, endDate);

    const [orders, expenses, pendingOrders, customerCount] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        select: { total: true },
      }),
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
    ]);

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    sendSuccess(res, {
      totalRevenue,
      totalExpense,
      totalProfit: totalRevenue - totalExpense,
      totalOrders: orders.length,
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
    const orders = await prisma.order.findMany({
      where: getOrderRangeWhere(startDate, endDate),
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const grouped = new Map<string, { date: string; revenue: number; orders: number }>();
    for (const order of orders) {
      const key = toISODate(order.createdAt);
      const current = grouped.get(key) ?? { date: key, revenue: 0, orders: 0 };
      current.revenue += order.total;
      current.orders += 1;
      grouped.set(key, current);
    }

    sendSuccess(res, [...grouped.values()]);
  }),
);

reportsRouter.get(
  "/produk-terlaris",
  asyncHandler(async (req, res) => {
    const startDate = String(req.query.startDate ?? "");
    const endDate = String(req.query.endDate ?? "");
    const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 50);

    const items = await prisma.orderItem.findMany({
      where: {
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
    const orders = await prisma.order.findMany({
      where: getOrderRangeWhere(startDate, endDate),
      select: {
        paymentMethod: true,
        total: true,
      },
    });

    const grouped = new Map<string, { method: string; value: number }>();
    for (const order of orders) {
      const key = order.paymentMethod;
      const current = grouped.get(key) ?? { method: key, value: 0 };
      current.value += order.total;
      grouped.set(key, current);
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
