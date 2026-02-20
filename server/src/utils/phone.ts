const ONLY_DIGITS_REGEX = /\D/g;

export const normalizePhoneNumber = (value: string): string => {
  let digits = value.replace(ONLY_DIGITS_REGEX, "");

  // Indonesia format normalization:
  // 62xxxxxxxxxx -> 0xxxxxxxxxx
  // 8xxxxxxxxxx  -> 08xxxxxxxxx
  if (digits.startsWith("62")) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.startsWith("8")) {
    digits = `0${digits}`;
  }

  return digits;
};

export const isValidPhoneNumber = (value: string): boolean => {
  return /^0\d{8,14}$/.test(value);
};
