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

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
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
        role: user.role,
        mustChangePassword: user.mustChangePassword,
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
        role: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "Data pengguna tidak ditemukan");
    }

    sendSuccess(res, user);
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
        mustChangePassword: false,
      },
    });

    sendSuccess(res, { message: "Password berhasil diganti" });
  }),
);

export { authRouter };
