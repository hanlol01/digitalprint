import { Router } from "express";
import {
  OrderStatus,
  PaymentMethod,
  Prisma,
  PricingUnit,
  StockDirection,
  StockMovementType,
  TransactionItemType,
} from "@prisma/client";
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
  itemType: z.nativeEnum(TransactionItemType).optional(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  displayId: z.string().uuid().optional(),
  quantity: z.number().int().positive().default(1),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  notes: z.string().max(250).optional(),
  specialNotes: z.array(z.string().max(120)).max(20).optional(),
  finishing: z.boolean().default(false),
});

const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(6),
  paymentMethod: z.nativeEnum(PaymentMethod),
  downPayment: z.number().int().nonnegative().optional(),
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
  settlementAmount: z.number().int().positive().optional(),
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
  itemTypes: [...new Set(order.items.map((item) => item.itemType))],
  items: order.items.map((item) => ({
    ...item,
    width: item.width ? toNumber(item.width) : null,
    height: item.height ? toNumber(item.height) : null,
  })),
});

const resolveItemType = (item: z.infer<typeof orderItemSchema>): TransactionItemType => item.itemType ?? TransactionItemType.produk;
const normalizeOrderItemSpecialNotes = (notes?: string[]): string[] => {
  if (!notes?.length) return [];
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const rawNote of notes) {
    const note = rawNote.trim();
    if (!note) continue;
    const key = note.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(note.slice(0, 120));
    if (normalized.length >= 20) break;
  }
  return normalized;
};
const resolveValidatedSpecialNotes = (
  notes: string[] | undefined,
  config: { enabled: boolean; options: string[]; productName: string },
): string[] => {
  const normalized = normalizeOrderItemSpecialNotes(notes);
  if (!config.enabled) {
    return [];
  }

  const optionMap = new Map<string, string>();
  for (const rawOption of config.options) {
    const option = rawOption.trim();
    if (!option) continue;
    const key = option.toLowerCase();
    if (!optionMap.has(key)) {
      optionMap.set(key, option.slice(0, 120));
    }
  }

  if (optionMap.size === 0) {
    throw new ApiError(400, `Produk "${config.productName}" belum memiliki opsi Catatan Khusus`);
  }
  if (normalized.length === 0) {
    throw new ApiError(400, `Produk "${config.productName}" wajib memilih minimal 1 Catatan Khusus`);
  }

  return normalized.map((note) => {
    const matched = optionMap.get(note.toLowerCase());
    if (!matched) {
      throw new ApiError(400, `Catatan Khusus "${note}" tidak valid untuk produk "${config.productName}"`);
    }
    return matched;
  });
};

const isAreaUnitName = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const unit = value.trim().toLowerCase();
  return unit === "m2" || unit === "cm";
};

const pricingUnitFromUnitName = (value: string | null | undefined): PricingUnit => {
  if (!value) return PricingUnit.per_pcs;
  const unit = value.trim().toLowerCase();
  if (unit === "m2") return PricingUnit.per_meter;
  if (unit === "cm") return PricingUnit.per_cm;
  if (unit === "lembar" || unit === "a3") return PricingUnit.per_lembar;
  return PricingUnit.per_pcs;
};

const resolveOrderPaymentOnCreate = (paymentMethod: PaymentMethod, total: number, downPaymentInput: number | undefined) => {
  if (paymentMethod !== PaymentMethod.piutang) {
    return {
      downPayment: 0,
      paidAmount: total,
      remainingAmount: 0,
    };
  }

  const downPayment = Math.min(downPaymentInput ?? 0, total);
  if (total > 0 && downPayment >= total) {
    throw new ApiError(400, "Untuk metode piutang, nominal DP harus lebih kecil dari total");
  }

  return {
    downPayment,
    paidAmount: downPayment,
    remainingAmount: Math.max(total - downPayment, 0),
  };
};

ordersRouter.get(
  "/",
  authorizeRoles("admin", "management", "operator"),
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;
    const statusQuery = String(req.query.status ?? "").trim();
    const status = STATUS_FLOW.includes(statusQuery as OrderStatus) ? (statusQuery as OrderStatus) : "";
    const search = String(req.query.search ?? "").trim();
    const itemTypeQuery = String(req.query.itemType ?? "").trim();
    const itemType = Object.values(TransactionItemType).includes(itemTypeQuery as TransactionItemType)
      ? (itemTypeQuery as TransactionItemType)
      : undefined;

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(itemType ? { items: { some: { itemType } } } : {}),
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
  authorizeRoles("admin", "management", "operator"),
  asyncHandler(async (req, res) => {
    const itemTypeQuery = String(req.query.itemType ?? "").trim();
    const itemType = Object.values(TransactionItemType).includes(itemTypeQuery as TransactionItemType)
      ? (itemTypeQuery as TransactionItemType)
      : undefined;

    const groups = await prisma.order.groupBy({
      by: ["status"],
      where: {
        deletedAt: null,
        ...(itemType ? { items: { some: { itemType } } } : {}),
      },
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
  authorizeRoles("admin", "management", "operator"),
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
  authorizeRoles("admin", "staff"),
  validateBody(createOrderSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createOrderSchema>;
    const normalizedCustomerPhone = normalizePhoneNumber(body.customerPhone);

    if (!isValidPhoneNumber(normalizedCustomerPhone)) {
      throw new ApiError(400, "Format nomor telepon pelanggan tidak valid");
    }

    const normalizedItems = body.items.map((item) => ({ ...item, itemType: resolveItemType(item) }));
    const productItems = normalizedItems.filter((item) => item.itemType === TransactionItemType.produk);
    const serviceItems = normalizedItems.filter((item) => item.itemType === TransactionItemType.jasa);
    const displayItems = normalizedItems.filter((item) => item.itemType === TransactionItemType.display);

    for (const item of productItems) {
      if (!item.variantId) {
        throw new ApiError(400, "Item produk wajib menyertakan variantId");
      }
      if (item.serviceId || item.displayId) {
        throw new ApiError(400, "Item produk tidak boleh menyertakan serviceId/displayId");
      }
    }
    for (const item of serviceItems) {
      if (!item.serviceId) {
        throw new ApiError(400, "Item jasa wajib menyertakan serviceId");
      }
      if (item.variantId || item.displayId) {
        throw new ApiError(400, "Item jasa tidak boleh menyertakan variantId/displayId");
      }
    }
    for (const item of displayItems) {
      if (!item.displayId) {
        throw new ApiError(400, "Item display wajib menyertakan displayId");
      }
      if (item.variantId || item.serviceId) {
        throw new ApiError(400, "Item display tidak boleh menyertakan variantId/serviceId");
      }
    }

    const variantIds = [...new Set(productItems.map((item) => item.variantId!))];
    const serviceIds = [...new Set(serviceItems.map((item) => item.serviceId!))];
    const displayIds = [...new Set(displayItems.map((item) => item.displayId!))];

    const [variants, services, displays] = await Promise.all([
      prisma.productMaterialVariant.findMany({
        where: {
          id: { in: variantIds },
          deletedAt: null,
          isActive: true,
        },
        include: {
          product: true,
          unit: true,
          recipes: true,
        },
      }),
      prisma.serviceCatalog.findMany({
        where: {
          id: { in: serviceIds },
          deletedAt: null,
          isActive: true,
        },
        include: {
          product: true,
          unit: true,
          serviceMaterial: true,
          finishing: true,
        },
      }),
      prisma.displayCatalog.findMany({
        where: {
          id: { in: displayIds },
          deletedAt: null,
          isActive: true,
        },
        include: {
          product: true,
          unit: true,
          frame: true,
          material: true,
          finishing: true,
        },
      }),
    ]);

    if (variants.length !== variantIds.length) {
      throw new ApiError(400, "Sebagian varian bahan tidak ditemukan");
    }
    if (services.length !== serviceIds.length) {
      throw new ApiError(400, "Sebagian katalog jasa tidak ditemukan");
    }
    if (displays.length !== displayIds.length) {
      throw new ApiError(400, "Sebagian katalog display tidak ditemukan");
    }

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    const serviceMap = new Map(services.map((service) => [service.id, service]));
    const displayMap = new Map(displays.map((display) => [display.id, display]));

    const stockUsageMap = new Map<string, number>();
    const itemPayload: Array<{
      itemType: TransactionItemType;
      productId: string;
      variantId: string | null;
      serviceId: string | null;
      displayId: string | null;
      referenceCode: string | null;
      itemLabel: string | null;
      unitLabel: string | null;
      productName: string;
      variantName: string;
      pricingUnit: PricingUnit;
      unitPrice: number;
      quantity: number;
      width: number | null;
      height: number | null;
      notes: string;
      specialNotes: string[];
      finishing: boolean;
      finishingCost: number;
      subtotal: number;
      estimatedMinutes: number;
    }> = [];

    let subtotal = 0;
    let estimatedMinutes = 0;

    for (const item of normalizedItems) {
      if (item.itemType === TransactionItemType.produk) {
        const variant = variantMap.get(item.variantId!);
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
        const unitName = variant.unit?.name ?? null;
        const requiresSize = variant.product.hasCustomSize && isAreaUnitName(unitName);

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
        const roundedSubtotal = Math.round(itemSubtotal);
        const specialNotes = resolveValidatedSpecialNotes(item.specialNotes, {
          enabled: variant.product.specialNotesEnabled,
          options: variant.product.specialNoteOptions,
          productName: variant.product.name,
        });

        itemPayload.push({
          itemType: TransactionItemType.produk,
          productId: variant.productId,
          variantId: variant.id,
          serviceId: null,
          displayId: null,
          referenceCode: variant.code ?? null,
          itemLabel: variant.name,
          unitLabel: unitName,
          productName: variant.product.name,
          variantName: variant.name,
          pricingUnit: unitName ? pricingUnitFromUnitName(unitName) : variant.product.pricingUnit,
          unitPrice,
          quantity,
          width: item.width ?? null,
          height: item.height ?? null,
          notes: item.notes ?? "",
          specialNotes,
          finishing: item.finishing,
          finishingCost: item.finishing ? variant.product.finishingCost : 0,
          subtotal: roundedSubtotal,
          estimatedMinutes: estimatedItemMinutes,
        });

        subtotal += roundedSubtotal;
        estimatedMinutes += estimatedItemMinutes;
        continue;
      }

      if (item.itemType === TransactionItemType.jasa) {
        const service = serviceMap.get(item.serviceId!);
        if (!service) {
          throw new ApiError(400, "Katalog jasa tidak valid");
        }
        if (service.productId !== item.productId) {
          throw new ApiError(400, "Produk dan jasa tidak cocok");
        }
        if (service.product.deletedAt || !service.product.isActive) {
          throw new ApiError(400, `Produk "${service.product.name}" sudah tidak aktif`);
        }

        const quantity = item.quantity ?? 1;
        const unitName = service.unit.name;
        const requiresSize = isAreaUnitName(unitName);
        if (requiresSize && (!item.width || !item.height)) {
          throw new ApiError(400, `Jasa "${service.code}" membutuhkan panjang dan lebar`);
        }

        const factor = requiresSize ? Number(item.width) * Number(item.height) * quantity : quantity;
        const roundedSubtotal = Math.round(factor * service.sellingPrice);
        const estimatedItemMinutes = service.product.estimatedMinutes * Math.max(quantity, 1);
        const specialNotes = resolveValidatedSpecialNotes(item.specialNotes, {
          enabled: service.product.specialNotesEnabled,
          options: service.product.specialNoteOptions,
          productName: service.product.name,
        });

        itemPayload.push({
          itemType: TransactionItemType.jasa,
          productId: service.productId,
          variantId: null,
          serviceId: service.id,
          displayId: null,
          referenceCode: service.code,
          itemLabel: `${service.serviceMaterial.name} - ${service.finishing.name}`,
          unitLabel: unitName,
          productName: service.product.name,
          variantName: `${service.serviceMaterial.name} - ${service.finishing.name}`,
          pricingUnit: pricingUnitFromUnitName(unitName),
          unitPrice: service.sellingPrice,
          quantity,
          width: item.width ?? null,
          height: item.height ?? null,
          notes: item.notes ?? "",
          specialNotes,
          finishing: false,
          finishingCost: 0,
          subtotal: roundedSubtotal,
          estimatedMinutes: estimatedItemMinutes,
        });

        subtotal += roundedSubtotal;
        estimatedMinutes += estimatedItemMinutes;
        continue;
      }

      const display = displayMap.get(item.displayId!);
      if (!display) {
        throw new ApiError(400, "Katalog display tidak valid");
      }
      if (display.productId !== item.productId) {
        throw new ApiError(400, "Produk dan display tidak cocok");
      }
      if (display.product.deletedAt || !display.product.isActive) {
        throw new ApiError(400, `Produk "${display.product.name}" sudah tidak aktif`);
      }

      const quantity = item.quantity ?? 1;
      if (quantity < display.minimumOrder) {
        throw new ApiError(400, `Display "${display.name}" minimal order ${display.minimumOrder}`);
      }

      const unitName = display.unit.name;
      const requiresSize = isAreaUnitName(unitName);
      if (requiresSize && (!item.width || !item.height)) {
        throw new ApiError(400, `Display "${display.name}" membutuhkan panjang dan lebar`);
      }

      const factor = requiresSize ? Number(item.width) * Number(item.height) * quantity : quantity;
      const roundedSubtotal = Math.round(factor * display.sellingPrice);
      const estimatedItemMinutes = display.product.estimatedMinutes * Math.max(quantity, 1);
      const specialNotes = resolveValidatedSpecialNotes(item.specialNotes, {
        enabled: display.product.specialNotesEnabled,
        options: display.product.specialNoteOptions,
        productName: display.product.name,
      });

      itemPayload.push({
        itemType: TransactionItemType.display,
        productId: display.productId,
        variantId: null,
        serviceId: null,
        displayId: display.id,
        referenceCode: display.code,
        itemLabel: display.name,
        unitLabel: unitName,
        productName: display.product.name,
        variantName: `${display.name} - ${display.finishing.name}`,
        pricingUnit: pricingUnitFromUnitName(unitName),
        unitPrice: display.sellingPrice,
        quantity,
        width: item.width ?? null,
        height: item.height ?? null,
        notes: item.notes ?? "",
        specialNotes,
        finishing: false,
        finishingCost: 0,
        subtotal: roundedSubtotal,
        estimatedMinutes: estimatedItemMinutes,
      });

      subtotal += roundedSubtotal;
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
    const paymentSnapshot = resolveOrderPaymentOnCreate(body.paymentMethod, total, body.downPayment);

    const created = await prisma.$transaction(
      async (tx) => {
        let customerId = body.customerId;
        if (customerId) {
          const existingCustomer = await tx.customer.findFirst({ where: { id: customerId, deletedAt: null } });
          if (!existingCustomer) {
            throw new ApiError(400, "Pelanggan tidak ditemukan");
          }
        } else {
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
            downPayment: paymentSnapshot.downPayment,
            paidAmount: paymentSnapshot.paidAmount,
            remainingAmount: paymentSnapshot.remainingAmount,
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
            itemType: item.itemType,
            productId: item.productId,
            variantId: item.variantId,
            serviceId: item.serviceId,
            displayId: item.displayId,
            referenceCode: item.referenceCode,
            itemLabel: item.itemLabel,
            unitLabel: item.unitLabel,
            productName: item.productName,
            variantName: item.variantName,
            pricingUnit: item.pricingUnit,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            width: item.width,
            height: item.height,
            notes: item.notes,
            specialNotes: item.specialNotes,
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
  authorizeRoles("admin", "operator"),
  validateBody(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { status, paymentMethod, settlementAmount } = req.body as z.infer<typeof updateStatusSchema>;

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
    const outstandingAmount = Math.max(order.remainingAmount, 0);
    const isUnpaidOrder = outstandingAmount > 0;
    if (isMovingToPickedUp && isUnpaidOrder) {
      if (!paymentMethod || paymentMethod === PaymentMethod.piutang) {
        throw new ApiError(400, "Pesanan belum lunas. Pilih metode pembayaran selain piutang untuk pelunasan");
      }
      if (!settlementAmount) {
        throw new ApiError(400, "Nominal pelunasan wajib diisi");
      }
      if (settlementAmount !== outstandingAmount) {
        throw new ApiError(400, "Nominal pelunasan harus sama dengan sisa pembayaran");
      }
    }

    const updateData: Prisma.OrderUpdateInput = {
      status,
    };
    if (isMovingToPickedUp && isUnpaidOrder && paymentMethod) {
      updateData.paymentMethod = paymentMethod;
      updateData.paidAmount = order.paidAmount + outstandingAmount;
      updateData.remainingAmount = 0;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
      include: orderInclude,
    });

    sendSuccess(res, serializeOrder(updated));
  }),
);

export { ordersRouter };

