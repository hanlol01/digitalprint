import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/lib/api";
import type { MaterialStock } from "@/types";

const queryKey = ["materials"] as const;

export interface CreateMaterialPayload {
  name: string;
  unit: string;
  costPrice: number;
  currentStock: number;
  minStock: number;
  lastRestocked?: string;
  isActive?: boolean;
}

export interface UpdateMaterialPayload {
  name?: string;
  unit?: string;
  costPrice?: number;
  minStock?: number;
  lastRestocked?: string;
  isActive?: boolean;
}

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
    mutationFn: (payload: CreateMaterialPayload) => postData<MaterialStock, CreateMaterialPayload>("/bahan", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateMaterialPayload & { id: string }) =>
      patchData<MaterialStock, UpdateMaterialPayload>(`/bahan/${id}`, payload),
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
