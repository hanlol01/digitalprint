import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { validateBody } from "../../middlewares/validate";
import { ApiError } from "../../utils/api-error";

const createServiceMaterialSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  isActive: z.boolean().optional(),
});

const updateServiceMaterialSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const generateServiceMaterialCode = async (): Promise<string> => {
  const prefix = "mtr";
  const rows = await prisma.serviceMaterialMaster.findMany({
    where: {
      OR: [{ code: { startsWith: "mtr-" } }, { code: { startsWith: "mjs-" } }],
    },
    select: { code: true },
  });
  const used = new Set(rows.map((row) => (row.code ?? "").trim().toLowerCase()).filter(Boolean));
  const maxIndex = rows.reduce((max, row) => {
    const match = (row.code ?? "").toLowerCase().match(/^m(?:js|tr)-(\d+)$/);
    if (!match) return max;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  let next = Math.max(maxIndex + 1, 1);
  while (used.has(`${prefix}-${String(next).padStart(3, "0")}`)) next += 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

const serviceMaterialsRouter = Router();
serviceMaterialsRouter.use(authenticate);
serviceMaterialsRouter.use(authorizeRoles("admin", "management", "staff"));

serviceMaterialsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const where: Prisma.ServiceMaterialMasterWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
    };

    const list = await prisma.serviceMaterialMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    sendSuccess(res, list);
  }),
);

serviceMaterialsRouter.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateBody(createServiceMaterialSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createServiceMaterialSchema>;
    const resolvedCode = body.code?.trim() || (await generateServiceMaterialCode());
    const created = await prisma.serviceMaterialMaster.create({
      data: {
        code: resolvedCode,
        name: body.name.trim(),
        isActive: body.isActive ?? true,
      },
    });
    sendSuccess(res, created, undefined, 201);
  }),
);

serviceMaterialsRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateBody(updateServiceMaterialSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateServiceMaterialSchema>;
    const existing = await prisma.serviceMaterialMaster.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Material jasa tidak ditemukan");
    }

    const updated = await prisma.serviceMaterialMaster.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        isActive: body.isActive,
      },
    });
    sendSuccess(res, updated);
  }),
);

serviceMaterialsRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.serviceMaterialMaster.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Material jasa tidak ditemukan");
    }

    await prisma.serviceMaterialMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    sendSuccess(res, { message: "Material jasa berhasil dihapus" });
  }),
);

export { serviceMaterialsRouter };
