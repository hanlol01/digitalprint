import type { Response } from "express";

export const sendSuccess = <T>(res: Response, data: T, meta?: unknown, status = 200): void => {
  if (meta) {
    res.status(status).json({ success: true, data, meta });
    return;
  }
  res.status(status).json({ success: true, data });
};
