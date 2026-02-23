import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api";
import type { FinishingMaster, FrameMaster, ServiceMaterialMaster, UnitMaster } from "@/types";

export const useUnits = (params?: { activeOnly?: boolean; search?: string }) => {
  return useQuery({
    queryKey: ["units", params?.activeOnly, params?.search] as const,
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
    queryKey: ["finishings", params?.activeOnly, params?.search] as const,
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
    queryKey: ["service-materials", params?.activeOnly, params?.search] as const,
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
    queryKey: ["frames", params?.activeOnly, params?.search] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      if (params?.activeOnly) query.set("aktif", "true");
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return getData<FrameMaster[]>(`/rangka${qs ? `?${qs}` : ""}`);
    },
  });
};
