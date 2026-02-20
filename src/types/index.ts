export type PricingUnit = "per_lembar" | "per_meter" | "per_cm" | "per_pcs";

export type OrderStatus = "menunggu_desain" | "proses_cetak" | "finishing" | "selesai" | "sudah_diambil";

export type PaymentMethod = "cash" | "transfer" | "qris" | "piutang";

export type UserRole = "owner" | "admin" | "kasir" | "operator";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
  errors?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface MaterialStock {
  id: string;
  name: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock: number;
  lastRestocked: string;
  isActive?: boolean;
}

export interface VariantMaterialRecipe {
  id: string;
  variantId: string;
  materialId: string;
  usagePerUnit: number;
  material?: MaterialStock;
}

export interface MaterialVariant {
  id: string;
  materialId: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  pricePerUnit: number;
  material?: MaterialStock;
  recipes?: VariantMaterialRecipe[];
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  pricingUnit: PricingUnit;
  materialVariants: MaterialVariant[];
  hasCustomSize: boolean;
  customWidth?: number | null;
  customHeight?: number | null;
  finishingCost: number;
  estimatedMinutes: number;
  isActive?: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  selectedMaterial: MaterialVariant | null;
  quantity: number;
  width?: number;
  height?: number;
  notes: string;
  finishing: boolean;
  subtotal: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  pricingUnit: PricingUnit;
  unitPrice: number;
  quantity: number;
  width: number | null;
  height: number | null;
  notes: string;
  finishing: boolean;
  finishingCost: number;
  subtotal: number;
  estimatedMinutes: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  deadline: string | null;
  createdAt: string;
  designFileUrl?: string | null;
  estimatedMinutes: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalSpent: number;
  totalOrders: number;
  loyaltyPoints: number;
  createdAt: string;
  isActive?: boolean;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdAt?: string;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalExpense: number;
  totalProfit: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  menunggu_desain: { label: "Menunggu Desain", color: "warning" },
  proses_cetak: { label: "Proses Cetak", color: "info" },
  finishing: { label: "Finishing", color: "accent" },
  selesai: { label: "Selesai", color: "success" },
  sudah_diambil: { label: "Sudah Diambil", color: "muted" },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  transfer: "Transfer Bank",
  qris: "QRIS",
  piutang: "Piutang",
};
