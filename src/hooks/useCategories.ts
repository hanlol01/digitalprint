import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, postData, patchData } from "@/lib/api";
import type { ProductCategory } from "@/types";

const queryKey = ["categories"] as const;

export const useCategories = (params?: { activeOnly?: boolean; search?: string }) => {
  return useQuery({
    queryKey: [...queryKey, params?.activeOnly, params?.search] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (params?.activeOnly) query.set("aktif", "true");
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return getData<ProductCategory[]>(`/kategori-produk${qs ? `?${qs}` : ""}`);
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; icon: string; isActive?: boolean }) =>
      postData<ProductCategory, { name: string; icon: string; isActive?: boolean }>("/kategori-produk", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; icon?: string; isActive?: boolean }) =>
      patchData<ProductCategory, { name?: string; icon?: string; isActive?: boolean }>(`/kategori-produk/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/kategori-produk/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};
