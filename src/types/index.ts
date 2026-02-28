export type PricingUnit = "per_lembar" | "per_meter" | "per_cm" | "per_pcs";
export type TransactionItemType = "produk" | "jasa" | "display";

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
  code?: string | null;
  name: string;
  icon: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface MaterialStock {
  id: string;
  code?: string | null;
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
  code?: string | null;
  materialId: string;
  unitId?: string | null;
  finishingId?: string | null;
  name: string;
  costPrice: number;
  sellingPrice: number;
  pricePerUnit: number;
  minimumOrder?: number;
  estimateText?: string | null;
  unit?: UnitMaster | null;
  finishing?: FinishingMaster | null;
  material?: MaterialStock;
  recipes?: VariantMaterialRecipe[];
}

export interface Product {
  id: string;
  code?: string | null;
  legacyNumber?: number | null;
  name: string;
  categoryId: string;
  unitId?: string | null;
  unit?: UnitMaster | null;
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
  itemType: TransactionItemType;
  product: Product;
  selectedMaterial: MaterialVariant | null;
  selectedService?: ServiceCatalog | null;
  selectedDisplay?: DisplayCatalog | null;
  quantity: number;
  width?: number;
  height?: number;
  notes: string;
  finishing: boolean;
  subtotal: number;
}

export interface UnitMaster {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinishingMaster {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceMaterialMaster {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FrameMaster {
  id: string;
  code: string;
  name: string;
  minStock?: number | null;
  buyPrice?: number | null;
  stock?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCatalog {
  id: string;
  code: string;
  productId: string;
  categoryId: string;
  unitId: string;
  serviceMaterialId: string;
  finishingId: string;
  sellingPrice: number;
  estimateText?: string | null;
  isActive?: boolean;
  product?: Product;
  category?: ProductCategory;
  unit?: UnitMaster;
  serviceMaterial?: ServiceMaterialMaster;
  finishing?: FinishingMaster;
}

export interface DisplayCatalog {
  id: string;
  code: string;
  name: string;
  productId: string;
  categoryId: string;
  unitId: string;
  frameId: string;
  materialId: string | null;
  finishingId: string;
  sellingPrice: number;
  minimumOrder: number;
  estimateText?: string | null;
  isActive?: boolean;
  product?: Product;
  category?: ProductCategory;
  unit?: UnitMaster;
  frame?: FrameMaster;
  material?: MaterialStock;
  finishing?: FinishingMaster;
}

export interface OrderItem {
  id: string;
  orderId: string;
  itemType: TransactionItemType;
  productId: string;
  variantId: string | null;
  serviceId?: string | null;
  displayId?: string | null;
  itemLabel?: string | null;
  unitLabel?: string | null;
  referenceCode?: string | null;
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
  itemTypes?: TransactionItemType[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  downPayment: number;
  paidAmount: number;
  remainingAmount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  deadline: string | null;
  createdAt: string;
  updatedAt?: string;
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

