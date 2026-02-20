import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/lib/api";
import type { Expense } from "@/types";

const queryKey = ["expenses"] as const;

export const useExpenses = (params?: { category?: string; startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: [...queryKey, params?.category, params?.startDate, params?.endDate] as const,
    queryFn: () => {
      const query = new URLSearchParams();
      query.set("limit", "200");
      if (params?.category) query.set("category", params.category);
      if (params?.startDate) query.set("startDate", params.startDate);
      if (params?.endDate) query.set("endDate", params.endDate);
      return getData<Expense[]>(`/pengeluaran?${query.toString()}`);
    },
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Expense, "id">) => postData<Expense, Omit<Expense, "id">>("/pengeluaran", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<Expense> & { id: string }) =>
      patchData<Expense, Partial<Expense>>(`/pengeluaran/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/pengeluaran/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
};
