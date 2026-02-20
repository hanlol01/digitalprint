export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount ?? 0);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("id-ID").format(num ?? 0);
};
