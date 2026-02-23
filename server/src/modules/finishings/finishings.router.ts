import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";

const finishingsRouter = Router();
finishingsRouter.use(authenticate);

finishingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const where: Prisma.FinishingMasterWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
    };

    const list = await prisma.finishingMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    sendSuccess(res, list);
  }),
);

export { finishingsRouter };
