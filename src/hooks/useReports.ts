import { useQuery } from "@tanstack/react-query";
import { apiRequest, getData } from "@/lib/api";
import type { DashboardSummary, PaginationMeta, PaymentMethod, OrderStatus, TransactionItemType } from "@/types";

type DateRange = {
  startDate?: string;
  endDate?: string;
  itemType?: TransactionItemType | "all";
  paymentMethod?: PaymentMethod | "all";
  status?: OrderStatus | "all";
};

type OrderTableItem = {
  itemLabel: string;
  quantity: number;
  unitPrice: number;
};

type OrderTableRow = {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  items: OrderTableItem[];
};

export type ReportOrderTableResponse = {
  data: OrderTableRow[];
  meta: PaginationMeta;
};

const queryFromRange = (range?: DateRange): string => {
  const query = new URLSearchParams();
  if (range?.startDate) query.set("startDate", range.startDate);
  if (range?.endDate) query.set("endDate", range.endDate);
  if (range?.itemType && range.itemType !== "all") query.set("itemType", range.itemType);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const useReportSummary = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "summary", range?.startDate, range?.endDate, range?.itemType] as const,
    queryFn: () => getData<DashboardSummary>(`/laporan/ringkasan${queryFromRange(range)}`),
  });
};

export const useDailySales = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "daily-sales", range?.startDate, range?.endDate, range?.itemType] as const,
    queryFn: () => getData<Array<{ date: string; revenue: number; orders: number }>>(`/laporan/penjualan-harian${queryFromRange(range)}`),
  });
};

export const useTopProducts = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "top-products", range?.startDate, range?.endDate, range?.itemType] as const,
    queryFn: () => getData<Array<{ name: string; sales: number; revenue: number }>>(`/laporan/produk-terlaris${queryFromRange(range)}`),
  });
};

export const usePaymentMethodReport = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "payment-method", range?.startDate, range?.endDate, range?.itemType] as const,
    queryFn: () => getData<Array<{ method: string; value: number }>>(`/laporan/metode-pembayaran${queryFromRange(range)}`),
  });
};

export const useExpenseByCategory = (range?: DateRange) => {
  return useQuery({
    queryKey: ["reports", "expense-category", range?.startDate, range?.endDate, range?.itemType] as const,
    queryFn: () =>
      getData<Array<{ category: string; value: number }>>(`/laporan/pengeluaran-per-kategori${queryFromRange(range)}`),
  });
};

export const useReportOrderTable = (
  params?: DateRange & {
    page?: number;
    limit?: number;
  },
) => {
  return useQuery({
    queryKey: [
      "reports",
      "order-table",
      params?.startDate,
      params?.endDate,
      params?.itemType,
      params?.paymentMethod,
      params?.status,
      params?.page,
      params?.limit,
    ] as const,
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.startDate) query.set("startDate", params.startDate);
      if (params?.endDate) query.set("endDate", params.endDate);
      if (params?.itemType && params.itemType !== "all") query.set("itemType", params.itemType);
      if (params?.paymentMethod && params.paymentMethod !== "all") query.set("paymentMethod", params.paymentMethod);
      if (params?.status && params.status !== "all") query.set("status", params.status);
      query.set("page", String(params?.page ?? 1));
      query.set("limit", String(params?.limit ?? 20));

      const response = await apiRequest<OrderTableRow[]>(`/laporan/tabel-transaksi?${query.toString()}`);
      return {
        data: response.data,
        meta: (response.meta as PaginationMeta | undefined) ?? {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          total: response.data.length,
          totalPages: 1,
        },
      } satisfies ReportOrderTableResponse;
    },
  });
};
