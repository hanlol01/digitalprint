import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, postData, patchData } from "@/lib/api";
import type { Product, PricingUnit } from "@/types";

type ProductApi = {
  id: string;
  name: string;
  categoryId: string;
  pricingUnit: PricingUnit;
  hasCustomSize: boolean;
  customWidth: number | null;
  customHeight: number | null;
  finishingCost: number;
  estimatedMinutes: number;
  isActive: boolean;
  variants: Array<{
    id: string;
    materialId: string;
    name: string;
    costPrice: number;
    sellingPrice: number;
    material: {
      id: string;
      name: string;
      unit: string;
      costPrice: number;
      sellingPrice: number;
      currentStock: number;
      minStock: number;
      lastRestocked: string;
    };
    recipes: Array<{
      id: string;
      variantId: string;
      materialId: string;
      usagePerUnit: number;
      material?: {
        id: string;
        name: string;
        unit: string;
        costPrice: number;
        sellingPrice: number;
        currentStock: number;
        minStock: number;
        lastRestocked: string;
      };
    }>;
  }>;
};

const queryKey = ["products"] as const;

const mapProduct = (product: ProductApi): Product => ({
  id: product.id,
  name: product.name,
  categoryId: product.categoryId,
  pricingUnit: product.pricingUnit,
  hasCustomSize: product.hasCustomSize,
  customWidth: product.customWidth,
  customHeight: product.customHeight,
  finishingCost: product.finishingCost,
  estimatedMinutes: product.estimatedMinutes,
  isActive: product.isActive,
  materialVariants: product.variants.map((variant) => ({
    id: variant.id,
    materialId: variant.materialId,
    name: variant.name,
    costPrice: variant.costPrice,
    sellingPrice: variant.sellingPrice,
    pricePerUnit: variant.sellingPrice,
    material: variant.material
      ? {
          id: variant.material.id,
          name: variant.material.name,
          unit: variant.material.unit,
          costPrice: variant.material.costPrice ?? variant.costPrice,
          sellingPrice: variant.material.sellingPrice ?? variant.sellingPrice,
          currentStock: variant.material.currentStock,
          minStock: variant.material.minStock,
          lastRestocked: variant.material.lastRestocked,
        }
      : undefined,
    recipes: variant.recipes.map((recipe) => ({
      id: recipe.id,
      variantId: recipe.variantId,
      materialId: recipe.materialId,
      usagePerUnit: recipe.usagePerUnit,
      material: recipe.material
        ? {
            id: recipe.material.id,
            name: recipe.material.name,
            unit: recipe.material.unit,
            costPrice: recipe.material.costPrice ?? 0,
            sellingPrice: recipe.material.sellingPrice ?? 0,
            currentStock: recipe.material.currentStock,
            minStock: recipe.material.minStock,
            lastRestocked: recipe.material.lastRestocked,
          }
        : undefined,
    })),
  })),
});

export type ProductPayload = {
  name: string;
  categoryId: string;
  pricingUnit: PricingUnit;
  hasCustomSize: boolean;
  customWidth?: number;
  customHeight?: number;
  finishingCost: number;
  estimatedMinutes: number;
  isActive?: boolean;
  variants: Array<{
    materialId: string;
    name: string;
    recipes?: Array<{
      materialId: string;
      usagePerUnit: number;
    }>;
  }>;
};

export const useProducts = (params?: { search?: string; categoryId?: string; activeOnly?: boolean }) => {
  return useQuery({
    queryKey: [...queryKey, params?.search, params?.categoryId, params?.activeOnly] as const,
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.categoryId) query.set("kategoriId", params.categoryId);
      if (params?.activeOnly) query.set("aktif", "true");
      query.set("limit", "200");
      const data = await getData<ProductApi[]>(`/produk?${query.toString()}`);
      return data.map(mapProduct);
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductPayload) => postData<ProductApi, ProductPayload>("/produk", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: ProductPayload & { id: string }) =>
      patchData<ProductApi, ProductPayload>(`/produk/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteData<{ message: string }>(`/produk/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};
