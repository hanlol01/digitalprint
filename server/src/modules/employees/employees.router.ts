import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { sendSuccess } from "../../utils/response";
import { hashPassword } from "../../utils/password";
import { assertValidPhone, normalizePhone } from "../../utils/phone";

const createEmployeeSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(2).max(120),
  address: z.string().max(255).optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().optional(),
});

const updateEmployeeSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  fullName: z.string().min(2).max(120).optional(),
  address: z.string().max(255).optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

const serializeEmployee = (
  user: Pick<
    Prisma.UserGetPayload<object>,
    "id" | "username" | "fullName" | "address" | "phone" | "role" | "isActive" | "createdAt" | "updatedAt"
  >,
) => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  address: user.address,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const employeesRouter = Router();
employeesRouter.use(authenticate);
employeesRouter.use(authorizeRoles("management"));

employeesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const searchPhone = search.replace(/\D/g, "");
    const roleQuery = String(req.query.role ?? "").trim();
    const role = Object.values(UserRole).includes(roleQuery as UserRole) ? (roleQuery as UserRole) : undefined;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { fullName: { contains: search, mode: "insensitive" } },
              ...(searchPhone ? [{ phone: { contains: searchPhone } }] : []),
            ],
          }
        : {}),
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        address: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { role: "asc" }, { username: "asc" }],
    });

    sendSuccess(res, users.map(serializeEmployee));
  }),
);

employeesRouter.post(
  "/",
  validateBody(createEmployeeSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createEmployeeSchema>;
    const normalizedUsername = body.username.trim().toLowerCase();
    const normalizedPhone = normalizePhone(body.phone);
    assertValidPhone(normalizedPhone);

    const existing = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    const passwordHash = await hashPassword(body.password);

    if (existing && !existing.deletedAt) {
      throw new ApiError(400, "Username sudah digunakan");
    }

    if (normalizedPhone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: normalizedPhone, deletedAt: null },
        select: { id: true },
      });
      if (existingPhone && existingPhone.id !== existing?.id) {
        throw new ApiError(400, "Nomor WhatsApp sudah digunakan");
      }
    }

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            username: normalizedUsername,
            passwordHash,
            fullName: body.fullName.trim(),
            address: body.address?.trim() || null,
            phone: normalizedPhone,
            role: body.role,
            isActive: body.isActive ?? true,
            deletedAt: null,
          },
          select: {
            id: true,
            username: true,
            fullName: true,
            address: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await prisma.user.create({
          data: {
            username: normalizedUsername,
            passwordHash,
            fullName: body.fullName.trim(),
            address: body.address?.trim() || null,
            phone: normalizedPhone,
            role: body.role,
            isActive: body.isActive ?? true,
          },
          select: {
            id: true,
            username: true,
            fullName: true,
            address: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    sendSuccess(res, serializeEmployee(user), undefined, 201);
  }),
);

employeesRouter.patch(
  "/:id",
  validateBody(updateEmployeeSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateEmployeeSchema>;
    const normalizedPhone = body.phone !== undefined ? normalizePhone(body.phone) : undefined;
    if (normalizedPhone !== undefined) {
      assertValidPhone(normalizedPhone);
    }

    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Karyawan tidak ditemukan");
    }

    const normalizedUsername = body.username?.trim().toLowerCase();
    if (normalizedUsername && normalizedUsername !== existing.username) {
      const usernameTaken = await prisma.user.findUnique({ where: { username: normalizedUsername } });
      if (usernameTaken && usernameTaken.id !== id && !usernameTaken.deletedAt) {
        throw new ApiError(400, "Username sudah digunakan");
      }
    }

    if (normalizedPhone !== undefined) {
      const samePhone = await prisma.user.findFirst({
        where: { phone: normalizedPhone, deletedAt: null, id: { not: id } },
        select: { id: true },
      });
      if (samePhone) {
        throw new ApiError(400, "Nomor WhatsApp sudah digunakan");
      }
    }

    const passwordHash = body.password ? await hashPassword(body.password) : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: normalizedUsername,
        fullName: body.fullName?.trim(),
        address: body.address !== undefined ? body.address.trim() || null : undefined,
        phone: normalizedPhone,
        role: body.role,
        isActive: body.isActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        address: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, serializeEmployee(updated));
  }),
);

employeesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    if (req.user?.id === id) {
      throw new ApiError(400, "Akun aktif Anda tidak dapat dihapus");
    }

    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Karyawan tidak ditemukan");
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    sendSuccess(res, { message: "Karyawan berhasil dihapus" });
  }),
);

export { employeesRouter };
