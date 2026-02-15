import { Product, ProductCategory, Order, Customer, MaterialStock } from '@/types';

export const categories: ProductCategory[] = [
  { id: 'print', name: 'Print A4/A3', icon: '🖨️' },
  { id: 'banner', name: 'Banner & Spanduk', icon: '🏷️' },
  { id: 'stiker', name: 'Stiker & Vinyl', icon: '📋' },
  { id: 'kartu', name: 'Kartu Nama', icon: '💳' },
  { id: 'brosur', name: 'Brosur & Flyer', icon: '📄' },
  { id: 'foto', name: 'Cetak Foto', icon: '📸' },
  { id: 'jilid', name: 'Jilid & Laminating', icon: '📚' },
  { id: 'custom', name: 'Custom Order', icon: '✨' },
];

export const products: Product[] = [
  {
    id: 'p1', name: 'Print A4 Warna', categoryId: 'print', pricingUnit: 'per_lembar',
    basePrice: 1500, materialVariants: [
      { id: 'art80', name: 'HVS 80gsm', pricePerUnit: 1500 },
      { id: 'art120', name: 'Art Paper 120gsm', pricePerUnit: 3000 },
      { id: 'art210', name: 'Art Paper 210gsm', pricePerUnit: 5000 },
    ], hasCustomSize: false, finishingCost: 0, estimatedMinutes: 5,
  },
  {
    id: 'p2', name: 'Print A3 Warna', categoryId: 'print', pricingUnit: 'per_lembar',
    basePrice: 3000, materialVariants: [
      { id: 'a3hvs', name: 'HVS 80gsm', pricePerUnit: 3000 },
      { id: 'a3art', name: 'Art Paper 120gsm', pricePerUnit: 6000 },
    ], hasCustomSize: false, finishingCost: 0, estimatedMinutes: 5,
  },
  {
    id: 'p3', name: 'Banner Indoor', categoryId: 'banner', pricingUnit: 'per_meter',
    basePrice: 35000, materialVariants: [
      { id: 'flexi_cn', name: 'Flexi China', pricePerUnit: 25000 },
      { id: 'flexi_kr', name: 'Flexi Korea', pricePerUnit: 45000 },
      { id: 'albatros', name: 'Albatros', pricePerUnit: 55000 },
    ], hasCustomSize: true, finishingCost: 10000, estimatedMinutes: 30,
  },
  {
    id: 'p4', name: 'Banner Outdoor', categoryId: 'banner', pricingUnit: 'per_meter',
    basePrice: 50000, materialVariants: [
      { id: 'flexi_cn2', name: 'Flexi China 440gsm', pricePerUnit: 35000 },
      { id: 'flexi_kr2', name: 'Flexi Korea 440gsm', pricePerUnit: 60000 },
    ], hasCustomSize: true, finishingCost: 15000, estimatedMinutes: 45,
  },
  {
    id: 'p5', name: 'Spanduk', categoryId: 'banner', pricingUnit: 'per_meter',
    basePrice: 40000, materialVariants: [
      { id: 'kain', name: 'Kain', pricePerUnit: 40000 },
      { id: 'flexi_sp', name: 'Flexi 280gsm', pricePerUnit: 30000 },
    ], hasCustomSize: true, finishingCost: 20000, estimatedMinutes: 60,
  },
  {
    id: 'p6', name: 'Stiker Vinyl', categoryId: 'stiker', pricingUnit: 'per_meter',
    basePrice: 70000, materialVariants: [
      { id: 'vinyl_doff', name: 'Vinyl Doff', pricePerUnit: 70000 },
      { id: 'vinyl_glossy', name: 'Vinyl Glossy', pricePerUnit: 70000 },
      { id: 'vinyl_trans', name: 'Vinyl Transparan', pricePerUnit: 85000 },
    ], hasCustomSize: true, finishingCost: 5000, estimatedMinutes: 20,
  },
  {
    id: 'p7', name: 'Stiker Ritrama', categoryId: 'stiker', pricingUnit: 'per_cm',
    basePrice: 150, materialVariants: [
      { id: 'rit_doff', name: 'Ritrama Doff', pricePerUnit: 150 },
      { id: 'rit_glossy', name: 'Ritrama Glossy', pricePerUnit: 150 },
    ], hasCustomSize: true, finishingCost: 2000, estimatedMinutes: 15,
  },
  {
    id: 'p8', name: 'Kartu Nama', categoryId: 'kartu', pricingUnit: 'per_pcs',
    basePrice: 500, materialVariants: [
      { id: 'art260', name: 'Art Carton 260gsm', pricePerUnit: 500 },
      { id: 'art310', name: 'Art Carton 310gsm', pricePerUnit: 700 },
      { id: 'linen', name: 'Linen', pricePerUnit: 1200 },
    ], hasCustomSize: false, finishingCost: 500, estimatedMinutes: 30,
  },
  {
    id: 'p9', name: 'Brosur A5', categoryId: 'brosur', pricingUnit: 'per_lembar',
    basePrice: 2000, materialVariants: [
      { id: 'br_art120', name: 'Art Paper 120gsm', pricePerUnit: 2000 },
      { id: 'br_art150', name: 'Art Paper 150gsm', pricePerUnit: 2500 },
    ], hasCustomSize: false, finishingCost: 500, estimatedMinutes: 10,
  },
  {
    id: 'p10', name: 'Cetak Foto 4R', categoryId: 'foto', pricingUnit: 'per_lembar',
    basePrice: 5000, materialVariants: [
      { id: 'glossy_photo', name: 'Glossy Photo', pricePerUnit: 5000 },
      { id: 'doff_photo', name: 'Doff Photo', pricePerUnit: 5000 },
    ], hasCustomSize: false, finishingCost: 0, estimatedMinutes: 5,
  },
  {
    id: 'p11', name: 'Jilid Soft Cover', categoryId: 'jilid', pricingUnit: 'per_pcs',
    basePrice: 15000, materialVariants: [
      { id: 'sc_std', name: 'Standard', pricePerUnit: 15000 },
    ], hasCustomSize: false, finishingCost: 0, estimatedMinutes: 20,
  },
  {
    id: 'p12', name: 'Laminating A4', categoryId: 'jilid', pricingUnit: 'per_lembar',
    basePrice: 3000, materialVariants: [
      { id: 'lam_glossy', name: 'Glossy', pricePerUnit: 3000 },
      { id: 'lam_doff', name: 'Doff', pricePerUnit: 3500 },
    ], hasCustomSize: false, finishingCost: 0, estimatedMinutes: 3,
  },
];

export const mockOrders: Order[] = [
  {
    id: 'o1', orderNumber: 'ORD-20260215-001', customerName: 'Budi Santoso', customerPhone: '081234567890',
    items: [], status: 'proses_cetak', paymentMethod: 'cash', subtotal: 350000, discount: 0, tax: 0, total: 350000,
    notes: 'Banner untuk acara pernikahan', deadline: '2026-02-17', createdAt: '2026-02-15T08:30:00',
    estimatedMinutes: 45,
  },
  {
    id: 'o2', orderNumber: 'ORD-20260215-002', customerName: 'Siti Rahayu', customerPhone: '081345678901',
    items: [], status: 'menunggu_desain', paymentMethod: 'transfer', subtotal: 150000, discount: 10000, tax: 0, total: 140000,
    notes: 'Kartu nama 2 sisi, logo warna emas', deadline: '2026-02-18', createdAt: '2026-02-15T09:15:00',
    estimatedMinutes: 30,
  },
  {
    id: 'o3', orderNumber: 'ORD-20260215-003', customerName: 'Ahmad Hidayat', customerPhone: '081456789012',
    items: [], status: 'finishing', paymentMethod: 'qris', subtotal: 500000, discount: 50000, tax: 0, total: 450000,
    notes: 'Spanduk 5x1m, finishing mata ayam', deadline: '2026-02-16', createdAt: '2026-02-15T10:00:00',
    estimatedMinutes: 60,
  },
  {
    id: 'o4', orderNumber: 'ORD-20260214-004', customerName: 'Dewi Lestari', customerPhone: '081567890123',
    items: [], status: 'selesai', paymentMethod: 'cash', subtotal: 75000, discount: 0, tax: 0, total: 75000,
    notes: 'Print A4 50 lembar warna', deadline: '2026-02-14', createdAt: '2026-02-14T14:30:00',
    estimatedMinutes: 15,
  },
  {
    id: 'o5', orderNumber: 'ORD-20260214-005', customerName: 'Riko Pratama', customerPhone: '081678901234',
    items: [], status: 'sudah_diambil', paymentMethod: 'transfer', subtotal: 200000, discount: 0, tax: 0, total: 200000,
    notes: 'Stiker vinyl cutting', deadline: '2026-02-14', createdAt: '2026-02-14T11:00:00',
    estimatedMinutes: 20,
  },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Budi Santoso', phone: '081234567890', email: 'budi@email.com', totalSpent: 2500000, totalOrders: 12, loyaltyPoints: 250, createdAt: '2025-06-15' },
  { id: 'c2', name: 'Siti Rahayu', phone: '081345678901', email: 'siti@email.com', totalSpent: 1800000, totalOrders: 8, loyaltyPoints: 180, createdAt: '2025-08-20' },
  { id: 'c3', name: 'Ahmad Hidayat', phone: '081456789012', email: 'ahmad@email.com', totalSpent: 5200000, totalOrders: 25, loyaltyPoints: 520, createdAt: '2025-03-10' },
  { id: 'c4', name: 'Dewi Lestari', phone: '081567890123', email: 'dewi@email.com', totalSpent: 750000, totalOrders: 5, loyaltyPoints: 75, createdAt: '2025-11-05' },
  { id: 'c5', name: 'Riko Pratama', phone: '081678901234', email: 'riko@email.com', totalSpent: 3100000, totalOrders: 15, loyaltyPoints: 310, createdAt: '2025-04-22' },
];

export const mockMaterialStock: MaterialStock[] = [
  { id: 'm1', name: 'Tinta Cyan', unit: 'ml', currentStock: 450, minStock: 200, lastRestocked: '2026-02-10' },
  { id: 'm2', name: 'Tinta Magenta', unit: 'ml', currentStock: 380, minStock: 200, lastRestocked: '2026-02-10' },
  { id: 'm3', name: 'Tinta Yellow', unit: 'ml', currentStock: 520, minStock: 200, lastRestocked: '2026-02-10' },
  { id: 'm4', name: 'Tinta Black', unit: 'ml', currentStock: 150, minStock: 200, lastRestocked: '2026-02-08' },
  { id: 'm5', name: 'Flexi China 280gsm', unit: 'meter', currentStock: 45, minStock: 20, lastRestocked: '2026-02-12' },
  { id: 'm6', name: 'Flexi Korea 440gsm', unit: 'meter', currentStock: 12, minStock: 10, lastRestocked: '2026-02-05' },
  { id: 'm7', name: 'Vinyl Glossy', unit: 'meter', currentStock: 25, minStock: 15, lastRestocked: '2026-02-11' },
  { id: 'm8', name: 'Vinyl Doff', unit: 'meter', currentStock: 8, minStock: 15, lastRestocked: '2026-01-28' },
  { id: 'm9', name: 'Kertas HVS A4 80gsm', unit: 'rim', currentStock: 15, minStock: 5, lastRestocked: '2026-02-13' },
  { id: 'm10', name: 'Kertas Art Paper 120gsm A4', unit: 'rim', currentStock: 3, minStock: 3, lastRestocked: '2026-02-01' },
  { id: 'm11', name: 'Kertas Foto Glossy A4', unit: 'rim', currentStock: 8, minStock: 3, lastRestocked: '2026-02-09' },
  { id: 'm12', name: 'Art Carton 260gsm', unit: 'lembar', currentStock: 200, minStock: 100, lastRestocked: '2026-02-07' },
];

export const salesData = [
  { day: 'Sen', revenue: 850000, orders: 12 },
  { day: 'Sel', revenue: 1200000, orders: 18 },
  { day: 'Rab', revenue: 950000, orders: 14 },
  { day: 'Kam', revenue: 1450000, orders: 22 },
  { day: 'Jum', revenue: 1800000, orders: 28 },
  { day: 'Sab', revenue: 2200000, orders: 35 },
  { day: 'Min', revenue: 600000, orders: 8 },
];

export const topProducts = [
  { name: 'Banner Indoor', sales: 45, revenue: 2250000 },
  { name: 'Print A4 Warna', sales: 380, revenue: 570000 },
  { name: 'Kartu Nama', sales: 2500, revenue: 1250000 },
  { name: 'Stiker Vinyl', sales: 28, revenue: 1960000 },
  { name: 'Spanduk', sales: 15, revenue: 600000 },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}
