import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/lib/api";
import type { ServiceCatalog } from "@/types";

const queryKey = ["services"] as const;

export type ServicePayload = {
  code: string;
  productId: string;
  categoryId: string;
  unitId: string;
  serviceMaterialId: string;
  finishingId: string;
  sellingPrice: number;
  estimateText?: string | null;
  isActive?: boolean;
};

export const useServices = (params?: { search?: string; categoryId?: string; productId?: string; activeOnly?: boolean }) => {
  return useQuery({
    queryKey: [...queryKey, params?.search, params?.categoryId, params?.productId, params?.activeOnly] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.categoryId) query.set("kategoriId", params.categoryId);
      if (params?.productId) query.set("produkId", params.productId);
      if (params?.activeOnly) query.set("aktif", "true");
      const qs = query.toString();
      return getData<ServiceCatalog[]>(`/jasa${qs ? `?${qs}` : ""}`);
    },
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServicePayload) => postData<ServiceCatalog, ServicePayload>("/jasa", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: ServicePayload & { id: string }) =>
      patchData<ServiceCatalog, ServicePayload>(`/jasa/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/jasa/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};
