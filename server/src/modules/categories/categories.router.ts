import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { ApiError } from "../../utils/api-error";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";

const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const categoriesRouter = Router();
categoriesRouter.use(authenticate);

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const categories = await prisma.productCategory.findMany({
      where: {
        deletedAt: null,
        ...(onlyActive ? { isActive: true } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
    });

    sendSuccess(res, categories);
  }),
);

categoriesRouter.post(
  "/",
  authenticate,
  authorizeRoles("owner", "admin"),
  validateBody(createCategorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createCategorySchema>;
    const category = await prisma.productCategory.create({
      data: {
        name: body.name,
        icon: body.icon,
        isActive: body.isActive ?? true,
      },
    });
    sendSuccess(res, category, undefined, 201);
  }),
);

categoriesRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  validateBody(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateCategorySchema>;

    const existing = await prisma.productCategory.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Kategori tidak ditemukan");
    }

    const updated = await prisma.productCategory.update({
      where: { id },
      data: {
        name: body.name,
        icon: body.icon,
        isActive: body.isActive,
      },
    });

    sendSuccess(res, updated);
  }),
);

categoriesRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.productCategory.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Kategori tidak ditemukan");
    }

    await prisma.productCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    sendSuccess(res, { message: "Kategori berhasil dihapus" });
  }),
);

export { categoriesRouter };
