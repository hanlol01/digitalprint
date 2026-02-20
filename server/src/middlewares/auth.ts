import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/api-error";

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      throw new ApiError(401, "Token autentikasi tidak ditemukan");
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
    });

    if (!user) {
      throw new ApiError(401, "Sesi tidak valid");
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "Anda belum login"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, "Role Anda tidak memiliki akses"));
      return;
    }

    next();
  };
};
