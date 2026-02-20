import { Prisma } from "@prisma/client";

export const toNumber = (value: Prisma.Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value);
};
