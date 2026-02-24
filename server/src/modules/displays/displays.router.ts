import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { sendSuccess } from "../../utils/response";

const createDisplaySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  productId: z.string().uuid(),
  categoryId: z.string().uuid(),
  unitId: z.string().uuid(),
  frameId: z.string().uuid(),
  materialId: z.string().uuid().nullable().optional(),
  finishingId: z.string().uuid(),
  sellingPrice: z.number().int().nonnegative(),
  minimumOrder: z.number().int().positive().default(1),
  estimateText: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateDisplaySchema = createDisplaySchema.partial();

const displaysRouter = Router();
displaysRouter.use(authenticate);

const includeDisplay = {
  product: true,
  category: true,
  unit: true,
  frame: true,
  material: true,
  finishing: true,
} satisfies Prisma.DisplayCatalogInclude;

displaysRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";
    const categoryId = String(req.query.kategoriId ?? "").trim();
    const productId = String(req.query.produkId ?? "").trim();

    const where: Prisma.DisplayCatalogWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(productId ? { productId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { product: { name: { contains: search, mode: "insensitive" } } },
              { frame: { name: { contains: search, mode: "insensitive" } } },
              { material: { is: { name: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const list = await prisma.displayCatalog.findMany({
      where,
      include: includeDisplay,
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, list);
  }),
);

displaysRouter.post(
  "/",
  authenticate,
  authorizeRoles("owner", "admin"),
  validateBody(createDisplaySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createDisplaySchema>;

    const created = await prisma.displayCatalog.create({
      data: {
        code: body.code,
        name: body.name,
        productId: body.productId,
        categoryId: body.categoryId,
        unitId: body.unitId,
        frameId: body.frameId,
        materialId: body.materialId ?? null,
        finishingId: body.finishingId,
        sellingPrice: body.sellingPrice,
        minimumOrder: body.minimumOrder,
        estimateText: body.estimateText ?? null,
        isActive: body.isActive ?? true,
      },
      include: includeDisplay,
    });

    sendSuccess(res, created, undefined, 201);
  }),
);

displaysRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  validateBody(updateDisplaySchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateDisplaySchema>;

    const existing = await prisma.displayCatalog.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Display tidak ditemukan");
    }

    const updated = await prisma.displayCatalog.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        productId: body.productId,
        categoryId: body.categoryId,
        unitId: body.unitId,
        frameId: body.frameId,
        materialId: body.materialId,
        finishingId: body.finishingId,
        sellingPrice: body.sellingPrice,
        minimumOrder: body.minimumOrder,
        estimateText: body.estimateText ?? undefined,
        isActive: body.isActive,
      },
      include: includeDisplay,
    });

    sendSuccess(res, updated);
  }),
);

displaysRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.displayCatalog.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Display tidak ditemukan");
    }

    await prisma.displayCatalog.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    sendSuccess(res, { message: "Display berhasil dihapus" });
  }),
);

export { displaysRouter };
