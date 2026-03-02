import { Router } from "express";
import { Prisma, PricingUnit } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { ApiError } from "../../utils/api-error";
import { toNumber } from "../../utils/number";

const recipeSchema = z.object({
  materialId: z.string().uuid(),
  usagePerUnit: z.number().positive(),
});

const variantSchema = z.object({
  code: z.string().min(1).optional(),
  materialId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  finishingId: z.string().uuid().optional(),
  name: z.string().min(1),
  sellingPrice: z.number().int().nonnegative().optional(),
  minimumOrder: z.number().int().positive().default(1),
  estimateText: z.string().max(100).optional().nullable(),
  recipes: z.array(recipeSchema).default([]),
});

const createProductSchema = z.object({
  code: z.string().min(1).optional(),
  legacyNumber: z.number().int().positive().optional(),
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  pricingUnit: z.nativeEnum(PricingUnit),
  hasCustomSize: z.boolean().default(false),
  customWidth: z.number().positive().optional(),
  customHeight: z.number().positive().optional(),
  specialNotesEnabled: z.boolean().default(false),
  specialNotes: z.array(z.string().max(120)).max(20).default([]),
  finishingCost: z.number().int().nonnegative().default(0),
  estimatedMinutes: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  variants: z.array(variantSchema).min(1),
});

const updateProductSchema = z.object({
  code: z.string().min(1).optional(),
  legacyNumber: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  pricingUnit: z.nativeEnum(PricingUnit).optional(),
  hasCustomSize: z.boolean().optional(),
  customWidth: z.number().positive().optional(),
  customHeight: z.number().positive().optional(),
  specialNotesEnabled: z.boolean().optional(),
  specialNotes: z.array(z.string().max(120)).max(20).optional(),
  finishingCost: z.number().int().nonnegative().optional(),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  variants: z.array(variantSchema).optional(),
});

const productsRouter = Router();
productsRouter.use(authenticate);
productsRouter.use(authorizeRoles("admin", "management", "staff"));

const includeProduct = {
  category: true,
  unit: true,
  variants: {
    where: { deletedAt: null, isActive: true },
    include: {
      material: true,
      unit: true,
      finishing: true,
      recipes: {
        include: {
          material: true,
        },
      },
    },
    orderBy: { name: "asc" as const },
  },
} satisfies Prisma.ProductInclude;

const serializeProduct = (product: Prisma.ProductGetPayload<{ include: typeof includeProduct }>) => {
  return {
    ...product,
    specialNotesEnabled: product.specialNotesEnabled,
    specialNotes: product.specialNoteOptions,
    customWidth: product.customWidth ? toNumber(product.customWidth) : null,
    customHeight: product.customHeight ? toNumber(product.customHeight) : null,
    unit: product.unit ?? null,
    variants: product.variants.map((variant) => ({
      ...variant,
      material: {
        ...variant.material,
        currentStock: toNumber(variant.material.currentStock),
        minStock: toNumber(variant.material.minStock),
      },
      recipes: variant.recipes.map((recipe) => ({
        ...recipe,
        usagePerUnit: toNumber(recipe.usagePerUnit),
      })),
    })),
  };
};

const MAX_SPECIAL_NOTES = 20;
const MAX_SPECIAL_NOTE_LENGTH = 120;

const normalizeSpecialNotes = (notes: string[]): string[] => {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawNote of notes) {
    const note = rawNote.trim();
    if (!note) continue;
    const clipped = note.slice(0, MAX_SPECIAL_NOTE_LENGTH);
    const key = clipped.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(clipped);
    if (normalized.length >= MAX_SPECIAL_NOTES) break;
  }

  return normalized;
};

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const search = String(req.query.search ?? "").trim();
    const categoryId = String(req.query.kategoriId ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: includeProduct,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    sendSuccess(
      res,
      products.map(serializeProduct),
      { page, limit, total, totalPages: Math.ceil(total / limit) },
    );
  }),
);

productsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: includeProduct,
    });

    if (!product) {
      throw new ApiError(404, "Produk tidak ditemukan");
    }

    sendSuccess(res, serializeProduct(product));
  }),
);

productsRouter.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateBody(createProductSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createProductSchema>;
    const normalizedSpecialNotes = normalizeSpecialNotes(body.specialNotes ?? []);

    if (body.hasCustomSize && (!body.customWidth || !body.customHeight)) {
      throw new ApiError(400, "Panjang dan lebar kustom wajib diisi jika ukuran kustom aktif");
    }
    if (body.specialNotesEnabled && normalizedSpecialNotes.length === 0) {
      throw new ApiError(400, "Tambahkan minimal 1 opsi Catatan Khusus saat fitur diaktifkan");
    }
    const materialIds = [...new Set(body.variants.map((variant) => variant.materialId))];
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds }, deletedAt: null, isActive: true },
      select: { id: true, costPrice: true, sellingPrice: true },
    });
    if (materials.length !== materialIds.length) {
      throw new ApiError(400, "Sebagian bahan varian tidak ditemukan atau tidak aktif");
    }
    const materialPriceMap = new Map(materials.map((material) => [material.id, material]));

    const created = await prisma.$transaction(async (tx) => {
      const variantCodes = body.variants
        .map((variant) => variant.code?.trim())
        .filter((code): code is string => Boolean(code));
      if (variantCodes.length > 0) {
        await tx.productMaterialVariant.updateMany({
          where: {
            deletedAt: { not: null },
            code: { in: variantCodes },
          },
          data: { code: null },
        });
      }

      const product = await tx.product.create({
        data: {
          code: body.code,
          legacyNumber: body.legacyNumber,
          name: body.name,
          categoryId: body.categoryId,
          unitId: body.unitId,
          pricingUnit: body.pricingUnit,
          hasCustomSize: body.hasCustomSize,
          customWidth: body.hasCustomSize ? body.customWidth : null,
          customHeight: body.hasCustomSize ? body.customHeight : null,
          specialNotesEnabled: body.specialNotesEnabled,
          specialNoteOptions: normalizedSpecialNotes,
          finishingCost: body.finishingCost,
          estimatedMinutes: body.estimatedMinutes,
          isActive: body.isActive,
        },
      });

      for (const variant of body.variants) {
        const materialPrice = materialPriceMap.get(variant.materialId);
        if (!materialPrice) {
          throw new ApiError(400, "Harga bahan varian tidak ditemukan");
        }

          const createdVariant = await tx.productMaterialVariant.create({
            data: {
              code: variant.code,
              productId: product.id,
              materialId: variant.materialId,
              unitId: variant.unitId,
              finishingId: variant.finishingId,
              name: variant.name,
              costPrice: materialPrice.costPrice,
              sellingPrice: variant.sellingPrice ?? materialPrice.sellingPrice,
              minimumOrder: variant.minimumOrder,
              estimateText: variant.estimateText ?? null,
            },
          });

        if (variant.recipes.length > 0) {
          await tx.variantMaterialRecipe.createMany({
            data: variant.recipes.map((recipe) => ({
              variantId: createdVariant.id,
              materialId: recipe.materialId,
              usagePerUnit: recipe.usagePerUnit,
            })),
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: includeProduct,
      });
    });

    sendSuccess(res, serializeProduct(created), undefined, 201);
  }),
);

productsRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateBody(updateProductSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateProductSchema>;

    const existing = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { variants: { where: { deletedAt: null } } },
    });
    if (!existing) {
      throw new ApiError(404, "Produk tidak ditemukan");
    }
    const hasCustomSize = body.hasCustomSize ?? existing.hasCustomSize;
    const customWidth = body.customWidth ?? toNumber(existing.customWidth);
    const customHeight = body.customHeight ?? toNumber(existing.customHeight);
    const normalizedSpecialNotes =
      body.specialNotes !== undefined
        ? normalizeSpecialNotes(body.specialNotes)
        : normalizeSpecialNotes(existing.specialNoteOptions);
    const specialNotesEnabled = body.specialNotesEnabled ?? existing.specialNotesEnabled;
    if (hasCustomSize && (!customWidth || !customHeight)) {
      throw new ApiError(400, "Panjang dan lebar kustom wajib diisi jika ukuran kustom aktif");
    }
    if (specialNotesEnabled && normalizedSpecialNotes.length === 0) {
      throw new ApiError(400, "Tambahkan minimal 1 opsi Catatan Khusus saat fitur diaktifkan");
    }
    let materialPriceMap: Map<string, { costPrice: number; sellingPrice: number }> = new Map();
    if (body.variants) {
      const materialIds = [...new Set(body.variants.map((variant) => variant.materialId))];
      const materials = await prisma.material.findMany({
        where: { id: { in: materialIds }, deletedAt: null, isActive: true },
        select: { id: true, costPrice: true, sellingPrice: true },
      });
      if (materials.length !== materialIds.length) {
        throw new ApiError(400, "Sebagian bahan varian tidak ditemukan atau tidak aktif");
      }
      materialPriceMap = new Map(materials.map((material) => [material.id, material]));
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          code: body.code,
          legacyNumber: body.legacyNumber,
          name: body.name,
          categoryId: body.categoryId,
          unitId: body.unitId,
          pricingUnit: body.pricingUnit,
          hasCustomSize: body.hasCustomSize,
          customWidth:
            body.hasCustomSize === false ? null : body.customWidth,
          customHeight:
            body.hasCustomSize === false ? null : body.customHeight,
          specialNotesEnabled: body.specialNotesEnabled,
          specialNoteOptions: body.specialNotes !== undefined ? normalizedSpecialNotes : undefined,
          finishingCost: body.finishingCost,
          estimatedMinutes: body.estimatedMinutes,
          isActive: body.isActive,
        },
      });

      if (body.variants) {
        const variantCodes = body.variants
          .map((variant) => variant.code?.trim())
          .filter((code): code is string => Boolean(code));
        if (variantCodes.length > 0) {
          await tx.productMaterialVariant.updateMany({
            where: {
              deletedAt: { not: null },
              code: { in: variantCodes },
            },
            data: { code: null },
          });
        }

        const existingVariantIds = existing.variants.map((variant) => variant.id);
        if (existingVariantIds.length > 0) {
          await tx.variantMaterialRecipe.deleteMany({
            where: { variantId: { in: existingVariantIds } },
          });
          await tx.productMaterialVariant.updateMany({
            where: { id: { in: existingVariantIds } },
            data: { code: null, deletedAt: new Date(), isActive: false },
          });
        }

        for (const variant of body.variants) {
          const materialPrice = materialPriceMap.get(variant.materialId);
          if (!materialPrice) {
            throw new ApiError(400, "Harga bahan varian tidak ditemukan");
          }

          const createdVariant = await tx.productMaterialVariant.create({
            data: {
              code: variant.code,
              productId: id,
              materialId: variant.materialId,
              unitId: variant.unitId,
              finishingId: variant.finishingId,
              name: variant.name,
              costPrice: materialPrice.costPrice,
              sellingPrice: variant.sellingPrice ?? materialPrice.sellingPrice,
              minimumOrder: variant.minimumOrder,
              estimateText: variant.estimateText ?? null,
            },
          });

          if (variant.recipes.length > 0) {
            await tx.variantMaterialRecipe.createMany({
              data: variant.recipes.map((recipe) => ({
                variantId: createdVariant.id,
                materialId: recipe.materialId,
                usagePerUnit: recipe.usagePerUnit,
              })),
            });
          }
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: includeProduct,
      });
    });

    sendSuccess(res, serializeProduct(updated));
  }),
);

productsRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Produk tidak ditemukan");
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });
      await tx.productMaterialVariant.updateMany({
        where: { productId: id, deletedAt: null },
        data: {
          code: null,
          deletedAt: new Date(),
          isActive: false,
        },
      });
    });

    sendSuccess(res, { message: "Produk berhasil dihapus" });
  }),
);

export { productsRouter };
