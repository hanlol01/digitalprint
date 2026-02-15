export type PricingUnit = 'per_lembar' | 'per_meter' | 'per_cm' | 'per_pcs';

export type OrderStatus = 'menunggu_desain' | 'proses_cetak' | 'finishing' | 'selesai' | 'sudah_diambil';

export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'piutang';

export type UserRole = 'owner' | 'admin' | 'kasir' | 'operator';

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
}

export interface MaterialVariant {
  id: string;
  name: string;
  pricePerUnit: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  pricingUnit: PricingUnit;
  basePrice: number;
  materialVariants: MaterialVariant[];
  hasCustomSize: boolean;
  finishingCost: number;
  estimatedMinutes: number;
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

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  deadline: string;
  createdAt: string;
  designFile?: string;
  estimatedMinutes: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalSpent: number;
  totalOrders: number;
  loyaltyPoints: number;
  createdAt: string;
}

export interface MaterialStock {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  lastRestocked: string;
}

export interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  menunggu_desain: { label: 'Menunggu Desain', color: 'warning' },
  proses_cetak: { label: 'Proses Cetak', color: 'info' },
  finishing: { label: 'Finishing', color: 'accent' },
  selesai: { label: 'Selesai', color: 'success' },
  sudah_diambil: { label: 'Sudah Diambil', color: 'muted' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  transfer: 'Transfer Bank',
  qris: 'QRIS',
  piutang: 'Piutang',
};
