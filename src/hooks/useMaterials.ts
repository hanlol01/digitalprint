import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/lib/api";
import type { MaterialStock } from "@/types";

const queryKey = ["materials"] as const;

export const useMaterials = (params?: { search?: string; lowStock?: boolean }) => {
  return useQuery({
    queryKey: [...queryKey, params?.search, params?.lowStock] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      query.set("limit", "200");
      if (params?.search) query.set("search", params.search);
      if (params?.lowStock) query.set("lowStock", "true");
      return getData<MaterialStock[]>(`/bahan?${query.toString()}`);
    },
  });
};

export const useCreateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<MaterialStock, "id">) => postData<MaterialStock, Omit<MaterialStock, "id">>("/bahan", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<MaterialStock> & { id: string }) =>
      patchData<MaterialStock, Partial<MaterialStock>>(`/bahan/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useDeleteMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/bahan/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useRestockMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; quantity: number; notes?: string }) =>
      postData<MaterialStock, { quantity: number; notes?: string }>(`/bahan/${payload.id}/restok`, {
        quantity: payload.quantity,
        notes: payload.notes,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};
