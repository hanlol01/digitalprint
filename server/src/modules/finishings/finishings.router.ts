import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { validateBody } from "../../middlewares/validate";
import { ApiError } from "../../utils/api-error";

const createFinishingSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  isActive: z.boolean().optional(),
});

const updateFinishingSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const generateFinishingCode = async (): Promise<string> => {
  const prefix = "fns";
  const rows = await prisma.finishingMaster.findMany({
    where: { code: { startsWith: `${prefix}-` } },
    select: { code: true },
  });
  const used = new Set(rows.map((row) => (row.code ?? "").trim().toLowerCase()).filter(Boolean));
  const maxIndex = rows.reduce((max, row) => {
    const match = (row.code ?? "").toLowerCase().match(/^fns-(\d+)$/);
    if (!match) return max;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  let next = Math.max(maxIndex + 1, 1);
  while (used.has(`${prefix}-${String(next).padStart(3, "0")}`)) next += 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

const finishingsRouter = Router();
finishingsRouter.use(authenticate);

finishingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const where: Prisma.FinishingMasterWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
    };

    const list = await prisma.finishingMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    sendSuccess(res, list);
  }),
);

finishingsRouter.post(
  "/",
  authenticate,
  authorizeRoles("owner", "admin"),
  validateBody(createFinishingSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createFinishingSchema>;
    const resolvedCode = body.code?.trim() || (await generateFinishingCode());
    const created = await prisma.finishingMaster.create({
      data: {
        code: resolvedCode,
        name: body.name.trim(),
        isActive: body.isActive ?? true,
      },
    });
    sendSuccess(res, created, undefined, 201);
  }),
);

finishingsRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  validateBody(updateFinishingSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateFinishingSchema>;
    const existing = await prisma.finishingMaster.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Finishing tidak ditemukan");
    }

    const updated = await prisma.finishingMaster.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        isActive: body.isActive,
      },
    });
    sendSuccess(res, updated);
  }),
);

finishingsRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.finishingMaster.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Finishing tidak ditemukan");
    }

    await prisma.finishingMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    sendSuccess(res, { message: "Finishing berhasil dihapus" });
  }),
);

export { finishingsRouter };
