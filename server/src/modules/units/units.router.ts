import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { validateBody } from "../../middlewares/validate";
import { ApiError } from "../../utils/api-error";

const createUnitSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  isActive: z.boolean().optional(),
});

const updateUnitSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const generateUnitCode = async (): Promise<string> => {
  const prefix = "st";
  const rows = await prisma.unitMaster.findMany({
    where: {
      OR: [{ code: { startsWith: "st-" } }, { code: { startsWith: "stn-" } }],
    },
    select: { code: true },
  });
  const used = new Set(rows.map((row) => (row.code ?? "").trim().toLowerCase()).filter(Boolean));
  const maxIndex = rows.reduce((max, row) => {
    const match = (row.code ?? "").toLowerCase().match(/^st(?:n)?-(\d+)$/);
    if (!match) return max;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  let next = Math.max(maxIndex + 1, 1);
  while (used.has(`${prefix}-${String(next).padStart(3, "0")}`)) next += 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

const unitsRouter = Router();
unitsRouter.use(authenticate);
unitsRouter.use(authorizeRoles("admin", "management", "staff"));

unitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const where: Prisma.UnitMasterWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
    };

    const list = await prisma.unitMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    sendSuccess(res, list);
  }),
);

unitsRouter.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateBody(createUnitSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createUnitSchema>;
    const resolvedCode = body.code?.trim() || (await generateUnitCode());
    const created = await prisma.unitMaster.create({
      data: {
        code: resolvedCode,
        name: body.name.trim(),
        isActive: body.isActive ?? true,
      },
    });
    sendSuccess(res, created, undefined, 201);
  }),
);

unitsRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateBody(updateUnitSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateUnitSchema>;
    const existing = await prisma.unitMaster.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Satuan tidak ditemukan");
    }

    const updated = await prisma.unitMaster.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        isActive: body.isActive,
      },
    });
    sendSuccess(res, updated);
  }),
);

unitsRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.unitMaster.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Satuan tidak ditemukan");
    }

    await prisma.unitMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    sendSuccess(res, { message: "Satuan berhasil dihapus" });
  }),
);

export { unitsRouter };
