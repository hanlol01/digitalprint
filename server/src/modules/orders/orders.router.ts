import { Router } from "express";
import { OrderStatus, PaymentMethod, Prisma, PricingUnit, StockDirection, StockMovementType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { sendSuccess } from "../../utils/response";
import { toNumber } from "../../utils/number";
import { generateOrderNumber } from "../../utils/order-number";
import { isValidPhoneNumber, normalizePhoneNumber } from "../../utils/phone";

const STATUS_FLOW: OrderStatus[] = [
  OrderStatus.menunggu_desain,
  OrderStatus.proses_cetak,
  OrderStatus.finishing,
  OrderStatus.selesai,
  OrderStatus.sudah_diambil,
];

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  notes: z.string().max(250).optional(),
  finishing: z.boolean().default(false),
});

const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(6),
  paymentMethod: z.nativeEnum(PaymentMethod),
  discount: z.number().int().nonnegative().default(0),
  tax: z.number().int().nonnegative().default(0),
  notes: z.string().max(500).optional(),
  deadline: z.string().optional(),
  designFileUrl: z.string().url().optional().or(z.literal("")),
  items: z.array(orderItemSchema).min(1),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

const ordersRouter = Router();
ordersRouter.use(authenticate);

const orderInclude = {
  customer: true,
  items: {
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.OrderInclude;

const serializeOrder = (order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) => ({
  ...order,
  items: order.items.map((item) => ({
    ...item,
    width: item.width ? toNumber(item.width) : null,
    height: item.height ? toNumber(item.height) : null,
  })),
});

ordersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;
    const statusQuery = String(req.query.status ?? "").trim();
    const status = STATUS_FLOW.includes(statusQuery as OrderStatus) ? (statusQuery as OrderStatus) : "";
    const search = String(req.query.search ?? "").trim();

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { customerName: { contains: search, mode: "insensitive" } },
              { customerPhone: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    sendSuccess(
      res,
      orders.map(serializeOrder),
      { page, limit, total, totalPages: Math.ceil(total / limit) },
    );
  }),
);

ordersRouter.get(
  "/ringkasan-status",
  asyncHandler(async (_req, res) => {
    const groups = await prisma.order.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    });

    const summary = STATUS_FLOW.map((status) => {
      const found = groups.find((group) => group.status === status);
      return {
        status,
        total: found?._count ?? 0,
      };
    });

    sendSuccess(res, summary);
  }),
);

ordersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: orderInclude,
    });

    if (!order) {
      throw new ApiError(404, "Pesanan tidak ditemukan");
    }

    sendSuccess(res, serializeOrder(order));
  }),
);

ordersRouter.post(
  "/",
  authenticate,
  authorizeRoles("owner", "admin", "kasir"),
  validateBody(createOrderSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createOrderSchema>;
    const normalizedCustomerPhone = normalizePhoneNumber(body.customerPhone);

    if (!isValidPhoneNumber(normalizedCustomerPhone)) {
      throw new ApiError(400, "Format nomor telepon pelanggan tidak valid");
    }

    const variantIds = body.items.map((item) => item.variantId);
    const variants = await prisma.productMaterialVariant.findMany({
      where: {
        id: { in: variantIds },
        deletedAt: null,
        isActive: true,
      },
      include: {
        product: true,
        recipes: true,
      },
    });

    if (variants.length !== variantIds.length) {
      throw new ApiError(400, "Sebagian varian bahan tidak ditemukan");
    }

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    const stockUsageMap = new Map<string, number>();
    const itemPayload: Array<{
      productId: string;
      variantId: string;
      productName: string;
      variantName: string;
      pricingUnit: PricingUnit;
      unitPrice: number;
      quantity: number;
      width: number | null;
      height: number | null;
      notes: string;
      finishing: boolean;
      finishingCost: number;
      subtotal: number;
      estimatedMinutes: number;
    }> = [];

    let subtotal = 0;
    let estimatedMinutes = 0;

    for (const item of body.items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) {
        throw new ApiError(400, "Varian bahan tidak valid");
      }
      if (variant.productId !== item.productId) {
        throw new ApiError(400, "Produk dan varian tidak cocok");
      }
      if (variant.product.deletedAt || !variant.product.isActive) {
        throw new ApiError(400, `Produk "${variant.product.name}" sudah tidak aktif`);
      }

      const unitPrice = variant.sellingPrice;
      const quantity = item.quantity ?? 1;
      const requiresSize =
        variant.product.pricingUnit === PricingUnit.per_meter ||
        variant.product.pricingUnit === PricingUnit.per_cm;

      if (requiresSize && (!item.width || !item.height)) {
        throw new ApiError(400, `Produk "${variant.product.name}" membutuhkan panjang dan lebar`);
      }

      const area = requiresSize ? Number(item.width) * Number(item.height) : 0;
      const factor = requiresSize ? area * quantity : quantity;
      let itemSubtotal = requiresSize ? area * unitPrice : quantity * unitPrice;
      if (item.finishing && variant.product.finishingCost > 0) {
        itemSubtotal += variant.product.finishingCost;
      }

      for (const recipe of variant.recipes) {
        const usage = toNumber(recipe.usagePerUnit) * factor;
        const current = stockUsageMap.get(recipe.materialId) ?? 0;
        stockUsageMap.set(recipe.materialId, current + usage);
      }

      const estimatedItemMinutes = variant.product.estimatedMinutes * Math.max(quantity, 1);

      itemPayload.push({
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        pricingUnit: variant.product.pricingUnit,
        unitPrice,
        quantity,
        width: item.width ?? null,
        height: item.height ?? null,
        notes: item.notes ?? "",
        finishing: item.finishing,
        finishingCost: item.finishing ? variant.product.finishingCost : 0,
        subtotal: Math.round(itemSubtotal),
        estimatedMinutes: estimatedItemMinutes,
      });

      subtotal += Math.round(itemSubtotal);
      estimatedMinutes += estimatedItemMinutes;
    }

    const materialIds = [...stockUsageMap.keys()];
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds }, deletedAt: null, isActive: true },
    });
    const materialMap = new Map(materials.map((material) => [material.id, material]));

    for (const [materialId, usedQty] of stockUsageMap.entries()) {
      const material = materialMap.get(materialId);
      if (!material) {
        throw new ApiError(400, "Resep bahan mengacu ke bahan yang tidak aktif");
      }
      if (toNumber(material.currentStock) < usedQty) {
        throw new ApiError(400, `Stok bahan "${material.name}" tidak mencukupi`);
      }
    }

    const total = Math.max(subtotal - body.discount + body.tax, 0);

    const created = await prisma.$transaction(
      async (tx) => {
        let customerId = body.customerId;
        if (customerId) {
          const existingCustomer = await tx.customer.findFirst({ where: { id: customerId, deletedAt: null } });
          if (!existingCustomer) {
            throw new ApiError(400, "Pelanggan tidak ditemukan");
          }
        } else {
          // Hard-enforce uniqueness by phone: repeat checkout on same phone always points
          // to one customer row, then total_orders/total_spent can be accumulated correctly.
          const customerByPhone = await tx.customer.upsert({
            where: { phone: normalizedCustomerPhone },
            update: {
              name: body.customerName,
              isActive: true,
              deletedAt: null,
            },
            create: {
              name: body.customerName,
              phone: normalizedCustomerPhone,
              isActive: true,
            },
          });
          customerId = customerByPhone.id;
        }

        const orderNumber = await generateOrderNumber(tx);
        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId: customerId ?? null,
            customerName: body.customerName,
            customerPhone: normalizedCustomerPhone,
            paymentMethod: body.paymentMethod,
            subtotal,
            discount: body.discount,
            tax: body.tax,
            total,
            notes: body.notes ?? "",
            deadline: body.deadline ? new Date(body.deadline) : null,
            designFileUrl: body.designFileUrl || null,
            estimatedMinutes,
          },
        });

        await tx.orderItem.createMany({
          data: itemPayload.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            pricingUnit: item.pricingUnit,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            width: item.width,
            height: item.height,
            notes: item.notes,
            finishing: item.finishing,
            finishingCost: item.finishingCost,
            subtotal: item.subtotal,
            estimatedMinutes: item.estimatedMinutes,
          })),
        });

        for (const [materialId, usedQty] of stockUsageMap.entries()) {
          const material = await tx.material.findUnique({ where: { id: materialId } });
          if (!material) {
            throw new ApiError(400, "Bahan tidak ditemukan saat proses checkout");
          }

          const newBalance = toNumber(material.currentStock) - usedQty;
          if (newBalance < 0) {
            throw new ApiError(400, `Stok bahan "${material.name}" tidak mencukupi`);
          }

          await tx.material.update({
            where: { id: materialId },
            data: { currentStock: newBalance },
          });

          await tx.stockMovement.create({
            data: {
              materialId,
              orderId: order.id,
              userId: req.user!.id,
              type: StockMovementType.order_checkout,
              direction: StockDirection.out,
              quantity: usedQty,
              balanceAfter: newBalance,
              notes: `Pemakaian bahan untuk pesanan ${orderNumber}`,
            },
          });
        }

        if (customerId) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              totalOrders: { increment: 1 },
              totalSpent: { increment: total },
              loyaltyPoints: { increment: Math.floor(total / 10000) },
            },
          });
        }

        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: orderInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    sendSuccess(res, serializeOrder(created), undefined, 201);
  }),
);

ordersRouter.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("owner", "admin", "kasir", "operator"),
  validateBody(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { status, paymentMethod } = req.body as z.infer<typeof updateStatusSchema>;

    const order = await prisma.order.findFirst({ where: { id, deletedAt: null } });
    if (!order) {
      throw new ApiError(404, "Pesanan tidak ditemukan");
    }

    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const nextIndex = STATUS_FLOW.indexOf(status);
    if (nextIndex < currentIndex) {
      throw new ApiError(400, "Status pesanan tidak boleh mundur");
    }
    if (nextIndex > currentIndex + 1) {
      throw new ApiError(400, "Status pesanan harus naik bertahap");
    }

    const isMovingToPickedUp = status === OrderStatus.sudah_diambil;
    const isUnpaidOrder = order.paymentMethod === PaymentMethod.piutang;
    if (isMovingToPickedUp && isUnpaidOrder) {
      if (!paymentMethod || paymentMethod === PaymentMethod.piutang) {
        throw new ApiError(400, "Pesanan belum lunas. Pilih metode pembayaran selain piutang untuk pelunasan");
      }
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(isMovingToPickedUp && isUnpaidOrder && paymentMethod ? { paymentMethod } : {}),
      },
      include: orderInclude,
    });

    sendSuccess(res, serializeOrder(updated));
  }),
);

export { ordersRouter };
