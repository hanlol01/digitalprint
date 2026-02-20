import { useMemo, useState } from "react";
import { CreditCard, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useCreateOrder } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { formatCurrency } from "@/lib/format";
import type { CartItem, MaterialVariant, PaymentMethod, Product } from "@/types";
import { PAYMENT_METHOD_LABELS } from "@/types";
import { toast } from "sonner";

const normalizePhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
};

const parseCurrencyInput = (value: string): number => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
};

const calculateSubtotal = (
  product: Product,
  material: MaterialVariant | null,
  qty: number,
  width?: number,
  height?: number,
  finishing?: boolean,
): number => {
  const fallbackPrice = product.materialVariants[0]?.sellingPrice ?? 0;
  const price = material ? material.sellingPrice : fallbackPrice;
  let total = 0;
  if ((product.pricingUnit === "per_meter" || product.pricingUnit === "per_cm") && width && height) {
    total = width * height * price;
  } else {
    total = qty * price;
  }

  if (finishing && product.finishingCost > 0) {
    total += product.finishingCost;
  }
  return Math.round(total);
};

export default function POS() {
  const { data: categories = [] } = useCategories({ activeOnly: true });
  const { data: products = [] } = useProducts({ activeOnly: true });
  const createOrder = useCreateOrder();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemMaterial, setItemMaterial] = useState<string>("");
  const [itemQty, setItemQty] = useState(1);
  const [itemWidth, setItemWidth] = useState<number>(1);
  const [itemHeight, setItemHeight] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState("");
  const [itemFinishing, setItemFinishing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const normalizedCustomerPhone = useMemo(() => normalizePhoneNumber(customerPhone), [customerPhone]);

  const { data: matchedCustomers = [] } = useCustomers({
    search: normalizedCustomerPhone,
    limit: 20,
    enabled: normalizedCustomerPhone.length >= 9,
  });

  const existingCustomer = useMemo(
    () => matchedCustomers.find((customer) => normalizePhoneNumber(customer.phone) === normalizedCustomerPhone),
    [matchedCustomers, normalizedCustomerPhone],
  );

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.categoryId === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter((product) => product.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const grandTotal = Math.max(cartTotal - discount, 0);
  const changeAmount = useMemo(() => amountPaid - grandTotal, [amountPaid, grandTotal]);
  const formattedAmountPaid = useMemo(() => amountPaid.toLocaleString("id-ID"), [amountPaid]);
  const isCashUnderpaid = paymentMethod === "cash" && amountPaid < grandTotal;

  const openAddItem = (product: Product) => {
    setSelectedProduct(product);
    setItemMaterial(product.materialVariants[0]?.id || "");
    setItemQty(1);
    setItemWidth(1);
    setItemHeight(1);
    setItemNotes("");
    setItemFinishing(false);
    setAddItemOpen(true);
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const material = selectedProduct.materialVariants.find((m) => m.id === itemMaterial) || null;
    const subtotal = calculateSubtotal(selectedProduct, material, itemQty, itemWidth, itemHeight, itemFinishing);
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      selectedMaterial: material,
      quantity: itemQty,
      width: selectedProduct.hasCustomSize ? itemWidth : undefined,
      height: selectedProduct.hasCustomSize ? itemHeight : undefined,
      notes: itemNotes,
      finishing: itemFinishing,
      subtotal,
    };
    setCart((prev) => [...prev, newItem]);
    setAddItemOpen(false);
    toast.success(`${selectedProduct.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const openPaymentDialog = () => {
    setAmountPaid(grandTotal);
    setPaymentOpen(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const normalizedPhone = normalizedCustomerPhone;
    const trimmedName = customerName.trim();

    if (!trimmedName || !normalizedPhone) {
      toast.error("Nama dan nomor telepon pelanggan wajib diisi");
      return;
    }
    if (!/^0\d{8,14}$/.test(normalizedPhone)) {
      toast.error("Format nomor telepon tidak valid");
      return;
    }
    if (isCashUnderpaid) {
      toast.error("Nominal bayar kurang dari total belanja");
      return;
    }

    try {
      await createOrder.mutateAsync({
        customerName: trimmedName,
        customerPhone: normalizedPhone,
        paymentMethod,
        discount,
        tax: 0,
        notes: "",
        items: cart.map((item) => ({
          productId: item.product.id,
          variantId: item.selectedMaterial?.id ?? item.product.materialVariants[0]?.id ?? "",
          quantity: item.quantity,
          width: item.width,
          height: item.height,
          notes: item.notes,
          finishing: item.finishing,
        })),
      });
      toast.success("Transaksi berhasil disimpan");
      setCart([]);
      setDiscount(0);
      setCustomerName("");
      setCustomerPhone("");
      setAmountPaid(0);
      setPaymentOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan transaksi");
    }
  };

  const pricingUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      per_lembar: "/lembar",
      per_meter: "/m²",
      per_cm: "/cm²",
      per_pcs: "/pcs",
    };
    return labels[unit] || "";
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)] animate-fade-in">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="mb-3">
          <Input
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card"
          />
        </div>

        <div className="pos-category-scroll flex gap-2 mb-3 pb-1 shrink-0 min-w-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            Semua
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-muted-foreground hover:bg-muted border border-border"
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-max">
          {filteredProducts.map((product) => (
            <button key={product.id} onClick={() => openAddItem(product)} className="pos-product-card text-left">
              <div className="text-2xl mb-2">{categories.find((category) => category.id === product.categoryId)?.icon}</div>
              <h4 className="font-semibold text-sm text-foreground leading-tight">{product.name}</h4>
              <p className="text-primary font-bold text-sm mt-1">
                {formatCurrency(product.materialVariants[0]?.sellingPrice ?? 0)}
                <span className="text-muted-foreground font-normal text-xs">{pricingUnitLabel(product.pricingUnit)}</span>
              </p>
              {product.hasCustomSize && <span className="badge-status bg-info/10 text-info mt-2">Custom Size</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-80 lg:shrink-0 flex flex-col bg-card rounded-xl border border-border shadow-sm p-4 min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Keranjang</h3>
          <span className="ml-auto text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
            {cart.length} item
          </span>
        </div>

        <div className="pos-cart-scroll flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">Belum ada item. Klik produk untuk menambahkan.</div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="pos-cart-item">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.selectedMaterial?.name}
                    {item.width && item.height ? ` • ${item.width}x${item.height}` : ` • ${item.quantity}x`}
                    {item.finishing ? " • +Finishing" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(item.subtotal)}</span>
                  <button onClick={() => removeFromCart(item.id)} className="p-1 text-destructive/70 hover:text-destructive rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">{formatCurrency(cartTotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Diskon</span>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="h-8 text-sm text-right" />
          </div>
          <div className="flex justify-between text-lg font-bold pt-1">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{formatCurrency(grandTotal)}</span>
          </div>
          <Button className="w-full h-12 text-base font-semibold" disabled={cart.length === 0} onClick={openPaymentDialog}>
            <CreditCard className="w-5 h-5 mr-2" />
            Bayar Sekarang
          </Button>
        </div>
      </div>

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.materialVariants.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Bahan</label>
                  <Select value={itemMaterial} onValueChange={setItemMaterial}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProduct.materialVariants.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} - {formatCurrency(material.sellingPrice)}
                          {pricingUnitLabel(selectedProduct.pricingUnit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedProduct.hasCustomSize ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Panjang</label>
                    <Input type="number" min={0.1} step={0.1} value={itemWidth} onChange={(e) => setItemWidth(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Lebar</label>
                    <Input type="number" min={0.1} step={0.1} value={itemHeight} onChange={(e) => setItemHeight(Number(e.target.value))} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Jumlah</label>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setItemQty(Math.max(1, itemQty - 1))}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input type="number" min={1} value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} className="text-center w-20" />
                    <Button variant="outline" size="icon" onClick={() => setItemQty(itemQty + 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedProduct.finishingCost > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={itemFinishing} onChange={(e) => setItemFinishing(e.target.checked)} className="rounded border-input" />
                  <span className="text-sm text-foreground">Tambah finishing (+{formatCurrency(selectedProduct.finishingCost)})</span>
                </label>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Catatan</label>
                <Textarea value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} rows={2} />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimasi harga:</span>
                  <span className="font-bold text-primary text-lg">
                    {formatCurrency(
                      calculateSubtotal(
                        selectedProduct,
                        selectedProduct.materialVariants.find((material) => material.id === itemMaterial) || null,
                        itemQty,
                        itemWidth,
                        itemHeight,
                        itemFinishing,
                      ),
                    )}
                  </span>
                </div>
              </div>

              <Button onClick={addToCart} className="w-full h-11">
                <Plus className="w-4 h-4 mr-2" /> Tambah ke Keranjang
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Pelanggan</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama pelanggan..." />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">No Telepon</label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+]/g, ""))}
                onBlur={() => setCustomerPhone((prev) => (prev ? normalizePhoneNumber(prev) : prev))}
                placeholder="08xxxxxxxxxx"
                inputMode="numeric"
              />
              {existingCustomer && (
                <div className="mt-2">
                  <span className="badge-status bg-warning/10 text-warning">Pelanggan lama</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([method, label]) => (
                  <button
                    key={method}
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method !== "cash") setAmountPaid(grandTotal);
                    }}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === method ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cart.length} item)</span>
                <span className="text-foreground">{formatCurrency(cartTotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="text-destructive">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span className="text-foreground">Total</span>
                <span className="text-primary">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Nominal Bayar</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-bold text-black">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formattedAmountPaid}
                    onChange={(e) => setAmountPaid(parseCurrencyInput(e.target.value))}
                    className="h-8 w-36 text-right"
                    disabled={paymentMethod !== "cash"}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kembalian</span>
                <span className="font-semibold text-foreground">{formatCurrency(changeAmount)}</span>
              </div>
            </div>
            <Button onClick={handleCheckout} className="w-full h-12 text-base font-semibold" disabled={createOrder.isPending || isCashUnderpaid}>
              {createOrder.isPending ? "Menyimpan..." : "Konfirmasi Pembayaran"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
