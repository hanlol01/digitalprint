import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";

export const validateBody =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateQuery =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.query = schema.parse(req.query);
    next();
  };
