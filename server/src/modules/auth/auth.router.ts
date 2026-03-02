import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { sendSuccess } from "../../utils/response";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signAccessToken } from "../../utils/jwt";
import { authenticate } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { assertValidPhone, normalizePhone } from "../../utils/phone";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  address: z.string().max(255).optional(),
  phone: z.string().optional(),
});

const authRouter = Router();

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findFirst({
      where: {
        username,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new ApiError(401, "Username atau password salah");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new ApiError(401, "Username atau password salah");
    }

    const token = signAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        address: user.address,
        phone: user.phone,
        role: user.role,
      },
    });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: { id: req.user!.id, deletedAt: null, isActive: true },
      select: {
        id: true,
        username: true,
        fullName: true,
        address: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "Data pengguna tidak ditemukan");
    }

    sendSuccess(res, user);
  }),
);

authRouter.patch(
  "/profile",
  authenticate,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const { fullName, address, phone } = req.body as z.infer<typeof updateProfileSchema>;
    const normalizedPhone = normalizePhone(phone);
    assertValidPhone(normalizedPhone);

    if (fullName !== undefined && fullName.trim().length < 2) {
      throw new ApiError(400, "Nama lengkap minimal 2 karakter");
    }

    if (normalizedPhone) {
      const samePhone = await prisma.user.findFirst({
        where: {
          phone: normalizedPhone,
          deletedAt: null,
          id: { not: req.user!.id },
        },
        select: { id: true },
      });
      if (samePhone) {
        throw new ApiError(400, "Nomor WhatsApp sudah digunakan");
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName !== undefined ? { fullName: fullName.trim() || null } : {}),
        ...(address !== undefined ? { address: address.trim() || null } : {}),
        ...(phone !== undefined ? { phone: normalizedPhone } : {}),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        address: true,
        phone: true,
        role: true,
      },
    });

    sendSuccess(res, updated, "Profil berhasil diperbarui");
  }),
);

authRouter.patch(
  "/ganti-password",
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new ApiError(404, "Data pengguna tidak ditemukan");
    }

    const isValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new ApiError(400, "Password lama tidak sesuai");
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
      },
    });

    sendSuccess(res, { message: "Password berhasil diganti" });
  }),
);

export { authRouter };
