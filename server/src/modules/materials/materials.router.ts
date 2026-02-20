import { Router } from "express";
import { Prisma, StockDirection, StockMovementType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { sendSuccess } from "../../utils/response";
import { toNumber } from "../../utils/number";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";

const createMaterialSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  costPrice: z.number().int().nonnegative().default(0),
  sellingPrice: z.number().int().nonnegative().default(0),
  currentStock: z.number().nonnegative().default(0),
  minStock: z.number().nonnegative().default(0),
  lastRestocked: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

const updateMaterialSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  costPrice: z.number().int().nonnegative().optional(),
  sellingPrice: z.number().int().nonnegative().optional(),
  minStock: z.number().nonnegative().optional(),
  lastRestocked: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

const restockSchema = z.object({
  quantity: z.number().positive(),
  notes: z.string().max(250).optional(),
});

const adjustSchema = z.object({
  direction: z.nativeEnum(StockDirection),
  quantity: z.number().positive(),
  notes: z.string().max(250).optional(),
});

const materialsRouter = Router();
materialsRouter.use(authenticate);

const serializeMaterial = (material: Prisma.MaterialGetPayload<object>) => ({
  ...material,
  currentStock: toNumber(material.currentStock),
  minStock: toNumber(material.minStock),
});

materialsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search ?? "").trim();
    const lowStock = req.query.lowStock === "true";

    const where: Prisma.MaterialWhereInput = {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };

    const [total, list] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const normalized = list.map(serializeMaterial);
    const filtered = lowStock
      ? normalized.filter((material) => material.currentStock <= material.minStock)
      : normalized;

    sendSuccess(
      res,
      filtered,
      { page, limit, total: lowStock ? filtered.length : total, totalPages: Math.ceil(total / limit) },
    );
  }),
);

materialsRouter.post(
  "/",
  authenticate,
  authorizeRoles("owner", "admin", "operator"),
  validateBody(createMaterialSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createMaterialSchema>;
    const material = await prisma.material.create({
      data: {
        name: body.name,
        unit: body.unit,
        costPrice: body.costPrice,
        sellingPrice: body.sellingPrice,
        currentStock: body.currentStock,
        minStock: body.minStock,
        lastRestocked: body.lastRestocked ? new Date(body.lastRestocked) : new Date(),
        isActive: body.isActive,
      },
    });
    sendSuccess(res, serializeMaterial(material), undefined, 201);
  }),
);

materialsRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin", "operator"),
  validateBody(updateMaterialSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateMaterialSchema>;

    const existing = await prisma.material.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Bahan tidak ditemukan");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const material = await tx.material.update({
        where: { id },
        data: {
          name: body.name,
          unit: body.unit,
          costPrice: body.costPrice,
          sellingPrice: body.sellingPrice,
          minStock: body.minStock,
          lastRestocked: body.lastRestocked ? new Date(body.lastRestocked) : undefined,
          isActive: body.isActive,
        },
      });

      if (body.costPrice !== undefined || body.sellingPrice !== undefined) {
        await tx.productMaterialVariant.updateMany({
          where: { materialId: id, deletedAt: null, isActive: true },
          data: {
            ...(body.costPrice !== undefined ? { costPrice: body.costPrice } : {}),
            ...(body.sellingPrice !== undefined ? { sellingPrice: body.sellingPrice } : {}),
          },
        });
      }

      return material;
    });

    sendSuccess(res, serializeMaterial(updated));
  }),
);

materialsRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.material.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Bahan tidak ditemukan");
    }

    await prisma.material.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    sendSuccess(res, { message: "Bahan berhasil dihapus" });
  }),
);

materialsRouter.post(
  "/:id/restok",
  authenticate,
  authorizeRoles("owner", "admin", "operator"),
  validateBody(restockSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof restockSchema>;

    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findFirst({ where: { id, deletedAt: null } });
      if (!material) {
        throw new ApiError(404, "Bahan tidak ditemukan");
      }

      const newBalance = toNumber(material.currentStock) + body.quantity;
      const updated = await tx.material.update({
        where: { id },
        data: {
          currentStock: newBalance,
          lastRestocked: new Date(),
        },
      });

      await tx.stockMovement.create({
        data: {
          materialId: id,
          userId: req.user!.id,
          type: StockMovementType.restock,
          direction: StockDirection.in,
          quantity: body.quantity,
          balanceAfter: newBalance,
          notes: body.notes ?? "",
        },
      });

      return updated;
    });

    sendSuccess(res, serializeMaterial(result));
  }),
);

materialsRouter.post(
  "/:id/penyesuaian-stok",
  authenticate,
  authorizeRoles("owner", "admin", "operator"),
  validateBody(adjustSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof adjustSchema>;

    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findFirst({ where: { id, deletedAt: null } });
      if (!material) {
        throw new ApiError(404, "Bahan tidak ditemukan");
      }

      const current = toNumber(material.currentStock);
      const newBalance = body.direction === StockDirection.in ? current + body.quantity : current - body.quantity;
      if (newBalance < 0) {
        throw new ApiError(400, "Stok tidak mencukupi untuk pengurangan");
      }

      const updated = await tx.material.update({
        where: { id },
        data: { currentStock: newBalance },
      });

      await tx.stockMovement.create({
        data: {
          materialId: id,
          userId: req.user!.id,
          type: StockMovementType.adjustment,
          direction: body.direction,
          quantity: body.quantity,
          balanceAfter: newBalance,
          notes: body.notes ?? "",
        },
      });

      return updated;
    });

    sendSuccess(res, serializeMaterial(result));
  }),
);

export { materialsRouter };
