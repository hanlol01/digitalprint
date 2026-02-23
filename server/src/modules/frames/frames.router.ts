import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { toNumber } from "../../utils/number";

const framesRouter = Router();
framesRouter.use(authenticate);

const serializeFrame = (frame: Prisma.FrameMasterGetPayload<object>) => ({
  ...frame,
  stock: frame.stock ? toNumber(frame.stock) : null,
  minStock: frame.minStock ? toNumber(frame.minStock) : null,
});

framesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const where: Prisma.FrameMasterWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
    };

    const list = await prisma.frameMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    sendSuccess(res, list.map(serializeFrame));
  }),
);

export { framesRouter };
