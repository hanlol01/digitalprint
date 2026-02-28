import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { sendSuccess } from "../../utils/response";

const createServiceSchema = z.object({
  code: z.string().min(1),
  productId: z.string().uuid(),
  categoryId: z.string().uuid(),
  unitId: z.string().uuid(),
  serviceMaterialId: z.string().uuid(),
  finishingId: z.string().uuid(),
  sellingPrice: z.number().int().nonnegative(),
  estimateText: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateServiceSchema = createServiceSchema.partial();

const servicesRouter = Router();
servicesRouter.use(authenticate);
servicesRouter.use(authorizeRoles("admin", "management", "staff"));

const includeService = {
  product: true,
  category: true,
  unit: true,
  serviceMaterial: true,
  finishing: true,
} satisfies Prisma.ServiceCatalogInclude;

servicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";
    const categoryId = String(req.query.kategoriId ?? "").trim();
    const productId = String(req.query.produkId ?? "").trim();

    const where: Prisma.ServiceCatalogWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(productId ? { productId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { product: { name: { contains: search, mode: "insensitive" } } },
              { serviceMaterial: { name: { contains: search, mode: "insensitive" } } },
              { finishing: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const list = await prisma.serviceCatalog.findMany({
      where,
      include: includeService,
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, list);
  }),
);

servicesRouter.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateBody(createServiceSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createServiceSchema>;

    const created = await prisma.serviceCatalog.create({
      data: {
        code: body.code,
        productId: body.productId,
        categoryId: body.categoryId,
        unitId: body.unitId,
        serviceMaterialId: body.serviceMaterialId,
        finishingId: body.finishingId,
        sellingPrice: body.sellingPrice,
        estimateText: body.estimateText ?? null,
        isActive: body.isActive ?? true,
      },
      include: includeService,
    });

    sendSuccess(res, created, undefined, 201);
  }),
);

servicesRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateBody(updateServiceSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateServiceSchema>;

    const existing = await prisma.serviceCatalog.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Jasa tidak ditemukan");
    }

    const updated = await prisma.serviceCatalog.update({
      where: { id },
      data: {
        code: body.code,
        productId: body.productId,
        categoryId: body.categoryId,
        unitId: body.unitId,
        serviceMaterialId: body.serviceMaterialId,
        finishingId: body.finishingId,
        sellingPrice: body.sellingPrice,
        estimateText: body.estimateText ?? undefined,
        isActive: body.isActive,
      },
      include: includeService,
    });

    sendSuccess(res, updated);
  }),
);

servicesRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.serviceCatalog.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Jasa tidak ditemukan");
    }

    await prisma.serviceCatalog.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    sendSuccess(res, { message: "Jasa berhasil dihapus" });
  }),
);

export { servicesRouter };
