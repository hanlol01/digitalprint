import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";

const unitsRouter = Router();
unitsRouter.use(authenticate);

unitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const onlyActive = req.query.aktif === "true";

    const where: Prisma.UnitMasterWhereInput = {
      deletedAt: null,
      ...(onlyActive ? { isActive: true } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
    };

    const list = await prisma.unitMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    sendSuccess(res, list);
  }),
);

export { unitsRouter };
