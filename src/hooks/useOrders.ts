import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getData, patchData, postData } from "@/lib/api";
import type { Order, OrderStatus, PaymentMethod, TransactionItemType } from "@/types";

const queryKey = ["orders"] as const;

export type CreateOrderPayload = {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  downPayment?: number;
  discount?: number;
  tax?: number;
  notes?: string;
  deadline?: string;
  designFileUrl?: string;
  items: Array<
    | {
        itemType?: "produk";
        productId: string;
        variantId: string;
        quantity: number;
        width?: number;
        height?: number;
        notes?: string;
        finishing: boolean;
      }
    | {
        itemType: "jasa";
        productId: string;
        serviceId: string;
        quantity: number;
        width?: number;
        height?: number;
        notes?: string;
        finishing?: false;
      }
    | {
        itemType: "display";
        productId: string;
        displayId: string;
        quantity: number;
        width?: number;
        height?: number;
        notes?: string;
        finishing?: false;
      }
  >;
};

export const useOrders = (params?: { search?: string; status?: string; itemType?: TransactionItemType | "all" }) => {
  return useQuery({
    queryKey: [...queryKey, params?.search, params?.status, params?.itemType] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      query.set("limit", "200");
      if (params?.search) query.set("search", params.search);
      if (params?.status && params.status !== "all") query.set("status", params.status);
      if (params?.itemType && params.itemType !== "all") query.set("itemType", params.itemType);
      return getData<Order[]>(`/pesanan?${query.toString()}`);
    },
  });
};

export const useOrderSummaryStatus = (itemType?: TransactionItemType | "all") => {
  return useQuery({
    queryKey: ["orders", "summary-status", itemType] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (itemType && itemType !== "all") query.set("itemType", itemType);
      const qs = query.toString();
      return getData<Array<{ status: OrderStatus; total: number }>>(`/pesanan-ringkasan-status${qs ? `?${qs}` : ""}`);
    },
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => postData<Order, CreateOrderPayload>("/pesanan", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["orders", "summary-status"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, paymentMethod, settlementAmount }: { id: string; status: OrderStatus; paymentMethod?: PaymentMethod; settlementAmount?: number }) =>
      patchData<Order, { status: OrderStatus; paymentMethod?: PaymentMethod; settlementAmount?: number }>(`/pesanan/${id}/status`, {
        status,
        paymentMethod,
        settlementAmount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["orders", "summary-status"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
};

