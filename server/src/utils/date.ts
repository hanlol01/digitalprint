import { env } from "../config/env";

type DateRange = {
  start: Date;
  end: Date;
};

const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

export const getTodayCode = (): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatted = formatter.format(new Date());
  return formatted.split("-").join("");
};

export const parseDateRange = (startDate?: string, endDate?: string): DateRange => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(now);

  return { start, end };
};

export const toISODate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};
