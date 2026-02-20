import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { SignOptions } from "jsonwebtoken";

type JwtPayload = {
  sub: string;
  username: string;
  role: string;
};

export const signAccessToken = (payload: JwtPayload): string => {
  const expiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
