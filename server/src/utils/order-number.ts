import type { Prisma, PrismaClient } from "@prisma/client";
import { getTodayCode } from "./date";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export const generateOrderNumber = async (tx: Prisma.TransactionClient | TransactionClient): Promise<string> => {
  const dayCode = getTodayCode();
  const prefix = `ORD-${dayCode}-`;

  const latestOrder = await tx.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  let sequence = 1;
  if (latestOrder?.orderNumber) {
    const lastSegment = latestOrder.orderNumber.split("-").at(-1);
    const parsed = Number(lastSegment);
    if (Number.isFinite(parsed)) {
      sequence = parsed + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(3, "0")}`;
};
