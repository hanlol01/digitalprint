import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { ApiError } from "../../utils/api-error";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { isValidPhoneNumber, normalizePhoneNumber } from "../../utils/phone";

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

const customersRouter = Router();
customersRouter.use(authenticate);

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search ?? "").trim();

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    sendSuccess(res, customers, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }),
);

customersRouter.post(
  "/",
  authenticate,
  authorizeRoles("owner", "admin", "kasir"),
  validateBody(createCustomerSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createCustomerSchema>;
    const normalizedPhone = normalizePhoneNumber(body.phone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      throw new ApiError(400, "Format nomor telepon tidak valid");
    }
    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        phone: normalizedPhone,
        email: body.email || null,
        isActive: body.isActive ?? true,
      },
    });
    sendSuccess(res, customer, undefined, 201);
  }),
);

customersRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin", "kasir"),
  validateBody(updateCustomerSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateCustomerSchema>;

    const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Pelanggan tidak ditemukan");
    }

    let normalizedPhone: string | undefined;
    if (body.phone !== undefined) {
      normalizedPhone = normalizePhoneNumber(body.phone);
      if (!isValidPhoneNumber(normalizedPhone)) {
        throw new ApiError(400, "Format nomor telepon tidak valid");
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        phone: normalizedPhone,
        email: body.email === "" ? null : body.email,
        isActive: body.isActive,
      },
    });
    sendSuccess(res, updated);
  }),
);

customersRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Pelanggan tidak ditemukan");
    }

    await prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    sendSuccess(res, { message: "Pelanggan berhasil dihapus" });
  }),
);

export { customersRouter };
