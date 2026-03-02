import { ApiError } from "./api-error";

export const normalizePhone = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
};

export const assertValidPhone = (value: string | null): void => {
  if (!value) return;
  if (!/^\d+$/.test(value)) {
    throw new ApiError(400, "Nomor WhatsApp hanya boleh angka");
  }
};

export const normalizePhoneNumber = (value: string | null | undefined): string => normalizePhone(value) ?? "";

export const isValidPhoneNumber = (value: string): boolean => /^\d+$/.test(value.replace(/\D/g, ""));
