import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { ApiError } from "../../utils/api-error";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";

const createCategorySchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  icon: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const generateCategoryCode = async (): Promise<string> => {
  const prefix = "ktg";
  const rows = await prisma.productCategory.findMany({
    where: { code: { startsWith: `${prefix}-` } },
    select: { code: true },
  });
  const used = new Set(rows.map((row) => (row.code ?? "").trim().toLowerCase()).filter(Boolean));
  const maxIndex = rows.reduce((max, row) => {
    const match = (row.code ?? "").toLowerCase().match(/^ktg-(\d+)$/);
    if (!match) return max;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  let next = Math.max(maxIndex + 1, 1);
  while (used.has(`${prefix}-${String(next).padStart(3, "0")}`)) next += 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

const categoriesRouter = Router();
categoriesRouter.use(authenticate);
categoriesRouter.use(authorizeRoles("admin", "management", "staff"));

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
  authorizeRoles("admin"),
  validateBody(createCategorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createCategorySchema>;
    const resolvedCode = body.code?.trim() || (await generateCategoryCode());
    const category = await prisma.productCategory.create({
      data: {
        code: resolvedCode,
        name: body.name.trim(),
        icon: body.icon?.trim() || "box",
        isActive: body.isActive ?? true,
      },
    });
    sendSuccess(res, category, undefined, 201);
  }),
);

categoriesRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
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
        name: body.name?.trim(),
        icon: body.icon?.trim(),
        isActive: body.isActive,
      },
    });

    sendSuccess(res, updated);
  }),
);

categoriesRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
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
