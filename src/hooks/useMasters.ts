import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/lib/api";
import type { FinishingMaster, FrameMaster, ServiceMaterialMaster, UnitMaster } from "@/types";

const unitsQueryKey = ["units"] as const;
const finishingsQueryKey = ["finishings"] as const;
const serviceMaterialsQueryKey = ["service-materials"] as const;
const framesQueryKey = ["frames"] as const;

export const useUnits = (params?: { activeOnly?: boolean; search?: string }) => {
  return useQuery({
    queryKey: [...unitsQueryKey, params?.activeOnly, params?.search] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (params?.activeOnly) query.set("aktif", "true");
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return getData<UnitMaster[]>(`/satuan${qs ? `?${qs}` : ""}`);
    },
  });
};

export const useFinishings = (params?: { activeOnly?: boolean; search?: string }) => {
  return useQuery({
    queryKey: [...finishingsQueryKey, params?.activeOnly, params?.search] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (params?.activeOnly) query.set("aktif", "true");
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return getData<FinishingMaster[]>(`/finishing${qs ? `?${qs}` : ""}`);
    },
  });
};

export const useServiceMaterials = (params?: { activeOnly?: boolean; search?: string }) => {
  return useQuery({
    queryKey: [...serviceMaterialsQueryKey, params?.activeOnly, params?.search] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (params?.activeOnly) query.set("aktif", "true");
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return getData<ServiceMaterialMaster[]>(`/material-jasa${qs ? `?${qs}` : ""}`);
    },
  });
};

export const useFrames = (params?: { activeOnly?: boolean; search?: string }) => {
  return useQuery({
    queryKey: [...framesQueryKey, params?.activeOnly, params?.search] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (params?.activeOnly) query.set("aktif", "true");
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return getData<FrameMaster[]>(`/rangka${qs ? `?${qs}` : ""}`);
    },
  });
};

export const useCreateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { code?: string; name: string; isActive?: boolean }) =>
      postData<UnitMaster, { code?: string; name: string; isActive?: boolean }>("/satuan", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitsQueryKey }),
  });
};

export const useUpdateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; isActive?: boolean }) =>
      patchData<UnitMaster, { name?: string; isActive?: boolean }>(`/satuan/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitsQueryKey }),
  });
};

export const useDeleteUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/satuan/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitsQueryKey }),
  });
};

export const useCreateFinishing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { code?: string; name: string; isActive?: boolean }) =>
      postData<FinishingMaster, { code?: string; name: string; isActive?: boolean }>("/finishing", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: finishingsQueryKey }),
  });
};

export const useUpdateFinishing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; isActive?: boolean }) =>
      patchData<FinishingMaster, { name?: string; isActive?: boolean }>(`/finishing/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: finishingsQueryKey }),
  });
};

export const useDeleteFinishing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/finishing/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: finishingsQueryKey }),
  });
};

export const useCreateServiceMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { code?: string; name: string; isActive?: boolean }) =>
      postData<ServiceMaterialMaster, { code?: string; name: string; isActive?: boolean }>("/material-jasa", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceMaterialsQueryKey }),
  });
};

export const useUpdateServiceMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; isActive?: boolean }) =>
      patchData<ServiceMaterialMaster, { name?: string; isActive?: boolean }>(`/material-jasa/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceMaterialsQueryKey }),
  });
};

export const useDeleteServiceMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/material-jasa/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serviceMaterialsQueryKey }),
  });
};

export const useCreateFrame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { code?: string; name: string; minStock?: number; buyPrice?: number; stock?: number; isActive?: boolean }) =>
      postData<FrameMaster, { code?: string; name: string; minStock?: number; buyPrice?: number; stock?: number; isActive?: boolean }>("/rangka", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: framesQueryKey }),
  });
};

export const useUpdateFrame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; minStock?: number; buyPrice?: number; stock?: number; isActive?: boolean }) =>
      patchData<FrameMaster, { name?: string; minStock?: number; buyPrice?: number; stock?: number; isActive?: boolean }>(`/rangka/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: framesQueryKey }),
  });
};

export const useDeleteFrame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/rangka/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: framesQueryKey }),
  });
};
