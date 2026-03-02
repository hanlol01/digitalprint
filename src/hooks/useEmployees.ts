import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/lib/api";
import type { Employee, UserRole } from "@/types";

const queryKey = ["employees"] as const;

export const useEmployees = (params?: { search?: string; role?: "all" | UserRole }) => {
  return useQuery({
    queryKey: [...queryKey, params?.search, params?.role] as const,
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.role && params.role !== "all") query.set("role", params.role);
      const qs = query.toString();
      return getData<Employee[]>(`/karyawan${qs ? `?${qs}` : ""}`);
    },
  });
};

export type EmployeeCreatePayload = {
  username: string;
  password: string;
  fullName: string;
  address?: string;
  phone: string;
  role: UserRole;
  isActive?: boolean;
};

export type EmployeeUpdatePayload = {
  id: string;
  username?: string;
  password?: string;
  fullName?: string;
  address?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeeCreatePayload) =>
      postData<Employee, EmployeeCreatePayload>("/karyawan", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: EmployeeUpdatePayload) =>
      patchData<Employee, Omit<EmployeeUpdatePayload, "id">>(`/karyawan/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/karyawan/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};
