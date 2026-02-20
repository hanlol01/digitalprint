import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api";
import type { DashboardSummary } from "@/types";

type DateRange = {
  startDate?: string;
  endDate?: string;
};

const queryFromRange = (range?: DateRange): string => {
  const query = new URLSearchParams();
  if (range?.startDate) query.set("startDate", range.startDate);
  if (range?.endDate) query.set("endDate", range.endDate);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const useReportSummary = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "summary", range?.startDate, range?.endDate] as const,
    queryFn: () => getData<DashboardSummary>(`/laporan/ringkasan${queryFromRange(range)}`),
  });
};

export const useDailySales = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "daily-sales", range?.startDate, range?.endDate] as const,
    queryFn: () => getData<Array<{ date: string; revenue: number; orders: number }>>(`/laporan/penjualan-harian${queryFromRange(range)}`),
  });
};

export const useTopProducts = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "top-products", range?.startDate, range?.endDate] as const,
    queryFn: () => getData<Array<{ name: string; sales: number; revenue: number }>>(`/laporan/produk-terlaris${queryFromRange(range)}`),
  });
};

export const usePaymentMethodReport = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "payment-method", range?.startDate, range?.endDate] as const,
    queryFn: () => getData<Array<{ method: string; value: number }>>(`/laporan/metode-pembayaran${queryFromRange(range)}`),
  });
};

export const useExpenseByCategory = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "expense-category", range?.startDate, range?.endDate] as const,
    queryFn: () =>
      getData<Array<{ category: string; value: number }>>(`/laporan/pengeluaran-per-kategori${queryFromRange(range)}`),
  });
};
