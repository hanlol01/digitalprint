import type { ApiResponse } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";
const TOKEN_KEY = "bizprint_token";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> => {
  const token = getToken();
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (response.status === 401) {
    clearToken();
  }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? "Request gagal diproses");
  }

  return payload;
};

export const getData = async <T>(path: string): Promise<T> => {
  const payload = await apiRequest<T>(path);
  return payload.data;
};

export const postData = async <T, B = unknown>(path: string, body: B): Promise<T> => {
  const payload = await apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return payload.data;
};

export const patchData = async <T, B = unknown>(path: string, body: B): Promise<T> => {
  const payload = await apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return payload.data;
};

export const deleteData = async <T>(path: string): Promise<T> => {
  const payload = await apiRequest<T>(path, {
    method: "DELETE",
  });
  return payload.data;
};
