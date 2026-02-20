import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getData, patchData, postData } from "@/lib/api";
import type { Order, OrderStatus, PaymentMethod } from "@/types";

const queryKey = ["orders"] as const;

export type CreateOrderPayload = {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  discount?: number;
  tax?: number;
  notes?: string;
  deadline?: string;
  designFileUrl?: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    width?: number;
    height?: number;
    notes?: string;
    finishing: boolean;
  }>;
};

export const useOrders = (params?: { search?: string; status?: string }) => {
  return useQuery({
    queryKey: [...queryKey, params?.search, params?.status] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      query.set("limit", "200");
      if (params?.search) query.set("search", params.search);
      if (params?.status && params.status !== "all") query.set("status", params.status);
      return getData<Order[]>(`/pesanan?${query.toString()}`);
    },
  });
};

export const useOrderSummaryStatus = () => {
  return useQuery({
    queryKey: ["orders", "summary-status"] as const,
    queryFn: () => getData<Array<{ status: OrderStatus; total: number }>>("/pesanan-ringkasan-status"),
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
    mutationFn: ({ id, status, paymentMethod }: { id: string; status: OrderStatus; paymentMethod?: PaymentMethod }) =>
      patchData<Order, { status: OrderStatus; paymentMethod?: PaymentMethod }>(`/pesanan/${id}/status`, {
        status,
        paymentMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["orders", "summary-status"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
};
