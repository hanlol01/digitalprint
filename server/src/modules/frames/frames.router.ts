import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { toNumber } from "../../utils/number";
import { validateBody } from "../../middlewares/validate";
import { ApiError } from "../../utils/api-error";

const createFrameSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  minStock: z.number().nonnegative().optional(),
  buyPrice: z.number().int().nonnegative().optional(),
  stock: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const updateFrameSchema = z.object({
  name: z.string().min(1).optional(),
  minStock: z.number().nonnegative().optional(),
  buyPrice: z.number().int().nonnegative().optional(),
  stock: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const generateFrameCode = async (): Promise<string> => {
  const prefix = "rk";
  const rows = await prisma.frameMaster.findMany({
    where: {
      OR: [{ code: { startsWith: "rk-" } }, { code: { startsWith: "rng-" } }],
    },
    select: { code: true },
  });
  const used = new Set(rows.map((row) => (row.code ?? "").trim().toLowerCase()).filter(Boolean));
  const maxIndex = rows.reduce((max, row) => {
    const match = (row.code ?? "").toLowerCase().match(/^r(?:k|ng)-(\d+)$/);
    if (!match) return max;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  let next = Math.max(maxIndex + 1, 1);
  while (used.has(`${prefix}-${String(next).padStart(3, "0")}`)) next += 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

const framesRouter = Router();
framesRouter.use(authenticate);
framesRouter.use(authorizeRoles("admin", "management", "staff"));

const serializeFrame = (frame: Prisma.FrameMasterGetPayload<object>) => ({
  ...frame,
  stock: frame.stock ? toNumber(frame.stock) : null,
  minStock: frame.minStock ? toNumber(frame.minStock) : null,
});

framesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const where: Prisma.FrameMasterWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
    };

    const list = await prisma.frameMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    sendSuccess(res, list.map(serializeFrame));
  }),
);

framesRouter.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateBody(createFrameSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createFrameSchema>;
    const resolvedCode = body.code?.trim() || (await generateFrameCode());
    const created = await prisma.frameMaster.create({
      data: {
        code: resolvedCode,
        name: body.name.trim(),
        minStock: body.minStock,
        buyPrice: body.buyPrice,
        stock: body.stock,
        isActive: body.isActive ?? true,
      },
    });
    sendSuccess(res, serializeFrame(created), undefined, 201);
  }),
);

framesRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateBody(updateFrameSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateFrameSchema>;
    const existing = await prisma.frameMaster.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Rangka tidak ditemukan");
    }

    const updated = await prisma.frameMaster.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        minStock: body.minStock,
        buyPrice: body.buyPrice,
        stock: body.stock,
        isActive: body.isActive,
      },
    });
    sendSuccess(res, serializeFrame(updated));
  }),
);

framesRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.frameMaster.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Rangka tidak ditemukan");
    }

    await prisma.frameMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    sendSuccess(res, { message: "Rangka berhasil dihapus" });
  }),
);

export { framesRouter };
