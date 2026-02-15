import { useState, useMemo } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, X } from 'lucide-react';
import { categories, products, formatCurrency } from '@/data/mockData';
import { CartItem, Product, MaterialVariant, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

function calculateSubtotal(product: Product, material: MaterialVariant | null, qty: number, w?: number, h?: number, finishing?: boolean): number {
  const price = material ? material.pricePerUnit : product.basePrice;
  let total = 0;
  if (product.pricingUnit === 'per_meter' && w && h) {
    total = w * h * price;
  } else if (product.pricingUnit === 'per_cm' && w && h) {
    total = w * h * price;
  } else {
    total = qty * price;
  }
  if (finishing && product.finishingCost > 0) {
    total += product.finishingCost;
  }
  return total;
}

export default function POS() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemMaterial, setItemMaterial] = useState<string>('');
  const [itemQty, setItemQty] = useState(1);
  const [itemWidth, setItemWidth] = useState<number>(1);
  const [itemHeight, setItemHeight] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState('');
  const [itemFinishing, setItemFinishing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [selectedCategory, searchQuery]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const grandTotal = cartTotal - discount;

  const openAddItem = (product: Product) => {
    setSelectedProduct(product);
    setItemMaterial(product.materialVariants[0]?.id || '');
    setItemQty(1);
    setItemWidth(1);
    setItemHeight(1);
    setItemNotes('');
    setItemFinishing(false);
    setAddItemOpen(true);
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const material = selectedProduct.materialVariants.find(m => m.id === itemMaterial) || null;
    const subtotal = calculateSubtotal(selectedProduct, material, itemQty, itemWidth, itemHeight, itemFinishing);
    const newItem: CartItem = {
      id: Date.now().toString(),
      product: selectedProduct,
      selectedMaterial: material,
      quantity: itemQty,
      width: selectedProduct.hasCustomSize ? itemWidth : undefined,
      height: selectedProduct.hasCustomSize ? itemHeight : undefined,
      notes: itemNotes,
      finishing: itemFinishing,
      subtotal,
    };
    setCart([...cart, newItem]);
    setAddItemOpen(false);
    toast.success(`${selectedProduct.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const handleCheckout = () => {
    toast.success('Transaksi berhasil disimpan!');
    setCart([]);
    setDiscount(0);
    setCustomerName('');
    setPaymentOpen(false);
  };

  const pricingUnitLabel = (unit: string) => {
    const labels: Record<string, string> = { per_lembar: '/lembar', per_meter: '/m²', per_cm: '/cm²', per_pcs: '/pcs' };
    return labels[unit] || '';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Product selection panel */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search */}
        <div className="mb-3">
          <Input 
            placeholder="Cari produk..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card text-muted-foreground hover:bg-muted border border-border'
            }`}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card text-muted-foreground hover:bg-muted border border-border'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-max">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => openAddItem(product)}
              className="pos-product-card text-left"
            >
              <div className="text-2xl mb-2">{categories.find(c => c.id === product.categoryId)?.icon}</div>
              <h4 className="font-semibold text-sm text-foreground leading-tight">{product.name}</h4>
              <p className="text-primary font-bold text-sm mt-1">
                {formatCurrency(product.basePrice)}
                <span className="text-muted-foreground font-normal text-xs">{pricingUnitLabel(product.pricingUnit)}</span>
              </p>
              {product.hasCustomSize && (
                <span className="badge-status bg-info/10 text-info mt-2">Custom Size</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-full lg:w-96 flex flex-col bg-card rounded-xl border border-border shadow-sm p-4 min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Keranjang</h3>
          <span className="ml-auto text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">{cart.length} item</span>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              Belum ada item. Klik produk untuk menambahkan.
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="pos-cart-item">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.selectedMaterial?.name}
                    {item.width && item.height ? ` • ${item.width}x${item.height}m` : ` • ${item.quantity}x`}
                    {item.finishing ? ' • +Finishing' : ''}
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

        {/* Cart footer */}
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">{formatCurrency(cartTotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Diskon</span>
            <Input 
              type="number" 
              value={discount} 
              onChange={(e) => setDiscount(Number(e.target.value))} 
              className="h-8 text-sm text-right" 
            />
          </div>
          <div className="flex justify-between text-lg font-bold pt-1">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{formatCurrency(grandTotal)}</span>
          </div>
          <Button 
            className="w-full h-12 text-base font-semibold" 
            disabled={cart.length === 0}
            onClick={() => setPaymentOpen(true)}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Bayar Sekarang
          </Button>
        </div>
      </div>

      {/* Add item dialog */}
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {selectedProduct.materialVariants.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name} - {formatCurrency(m.pricePerUnit)}{pricingUnitLabel(selectedProduct.pricingUnit)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedProduct.hasCustomSize ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Panjang ({selectedProduct.pricingUnit === 'per_cm' ? 'cm' : 'm'})
                    </label>
                    <Input type="number" min={0.1} step={0.1} value={itemWidth} onChange={(e) => setItemWidth(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Lebar ({selectedProduct.pricingUnit === 'per_cm' ? 'cm' : 'm'})
                    </label>
                    <Input type="number" min={0.1} step={0.1} value={itemHeight} onChange={(e) => setItemHeight(Number(e.target.value))} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Jumlah</label>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setItemQty(Math.max(1, itemQty - 1))}><Minus className="w-4 h-4" /></Button>
                    <Input type="number" min={1} value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} className="text-center w-20" />
                    <Button variant="outline" size="icon" onClick={() => setItemQty(itemQty + 1)}><Plus className="w-4 h-4" /></Button>
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
                <Textarea value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} placeholder="Warna, bahan khusus, dll..." rows={2} />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimasi harga:</span>
                  <span className="font-bold text-primary text-lg">
                    {formatCurrency(calculateSubtotal(
                      selectedProduct,
                      selectedProduct.materialVariants.find(m => m.id === itemMaterial) || null,
                      itemQty, itemWidth, itemHeight, itemFinishing
                    ))}
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

      {/* Payment dialog */}
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
              <label className="text-sm font-medium text-foreground mb-1.5 block">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([method, label]) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === method
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
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
            </div>
            <Button onClick={handleCheckout} className="w-full h-12 text-base font-semibold">
              Konfirmasi Pembayaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
