import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getData, patchData, postData, setToken } from "@/lib/api";
import type { UserRole } from "@/types";

const authKey = ["auth", "me"] as const;

export interface AuthUser {
  id: string;
  username: string;
  fullName: string | null;
  address: string | null;
  phone: string | null;
  role: UserRole;
}

export const useMe = () => {
  return useQuery({
    queryKey: authKey,
    queryFn: () => getData<AuthUser>("/auth/me"),
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { username: string; password: string }) =>
      postData<{ token: string; user: AuthUser }, { username: string; password: string }>("/auth/login", payload),
    onSuccess: (result) => {
      setToken(result.token);
      queryClient.invalidateQueries({ queryKey: authKey });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (payload: { oldPassword: string; newPassword: string }) =>
      patchData<{ message: string }, { oldPassword: string; newPassword: string }>("/auth/ganti-password", payload),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fullName?: string; address?: string; phone?: string }) =>
      patchData<AuthUser, { fullName?: string; address?: string; phone?: string }>("/auth/profile", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKey });
    },
  });
};
