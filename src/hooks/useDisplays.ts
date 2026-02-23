import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/lib/api";
import type { DisplayCatalog } from "@/types";

const queryKey = ["displays"] as const;

export type DisplayPayload = {
  code: string;
  name: string;
  productId: string;
  categoryId: string;
  unitId: string;
  frameId: string;
  materialId: string;
  finishingId: string;
  sellingPrice: number;
  minimumOrder: number;
  estimateText?: string | null;
  isActive?: boolean;
};

export const useDisplays = (params?: { search?: string; categoryId?: string; productId?: string; activeOnly?: boolean }) => {
  return useQuery({
    queryKey: [...queryKey, params?.search, params?.categoryId, params?.productId, params?.activeOnly] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.categoryId) query.set("kategoriId", params.categoryId);
      if (params?.productId) query.set("produkId", params.productId);
      if (params?.activeOnly) query.set("aktif", "true");
      const qs = query.toString();
      return getData<DisplayCatalog[]>(`/display${qs ? `?${qs}` : ""}`);
    },
  });
};

export const useCreateDisplay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DisplayPayload) => postData<DisplayCatalog, DisplayPayload>("/display", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useUpdateDisplay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: DisplayPayload & { id: string }) =>
      patchData<DisplayCatalog, DisplayPayload>(`/display/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useDeleteDisplay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/display/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};
