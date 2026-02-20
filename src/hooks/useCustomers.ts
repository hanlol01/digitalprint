import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/lib/api";
import type { Customer } from "@/types";

const queryKey = ["customers"] as const;

export const useCustomers = (params?: { search?: string; enabled?: boolean; limit?: number }) => {
  return useQuery({
    queryKey: [...queryKey, params?.search] as const,
    enabled: params?.enabled ?? true,
    queryFn: () => {
      const query = new URLSearchParams();
      query.set("limit", String(params?.limit ?? 200));
      if (params?.search) query.set("search", params.search);
      return getData<Customer[]>(`/pelanggan?${query.toString()}`);
    },
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; phone: string; email?: string }) =>
      postData<Customer, { name: string; phone: string; email?: string }>("/pelanggan", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; phone?: string; email?: string }) =>
      patchData<Customer, { name?: string; phone?: string; email?: string }>(`/pelanggan/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/pelanggan/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};
