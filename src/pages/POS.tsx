import { useMemo, useState } from "react";
import { CreditCard, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useCreateOrder } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useServices } from "@/hooks/useServices";
import { useDisplays } from "@/hooks/useDisplays";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type CartItem, type DisplayCatalog, type MaterialVariant, type PaymentMethod, type Product, type ServiceCatalog, type TransactionItemType } from "@/types";
import { toast } from "sonner";

const normalizePhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
};

const parseCurrencyInput = (value: string): number => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

const isAreaUnitName = (value?: string | null): boolean => {
  const unit = value?.trim().toLowerCase();
  return unit === "m2" || unit === "cm";
};

const sanitizeCategoryIcon = (icon?: string | null): string | null => {
  const value = icon?.trim();
  if (!value) return null;
  return value.toLowerCase() === "box" ? null : value;
};

const typeLabel: Record<TransactionItemType, string> = { produk: "Produk", jasa: "Jasa", display: "Display" };
const typeBadgeClass: Record<TransactionItemType, string> = {
  produk: "bg-primary/10 text-primary",
  jasa: "bg-info/10 text-info",
  display: "bg-warning/10 text-warning",
};

const createFallbackProduct = (id: string, name: string, categoryId: string): Product => ({
  id,
  name,
  categoryId,
  pricingUnit: "per_pcs",
  materialVariants: [],
  hasCustomSize: false,
  customWidth: null,
  customHeight: null,
  finishingCost: 0,
  estimatedMinutes: 0,
  isActive: true,
});

const calculateProductSubtotal = (price: number, qty: number, isArea: boolean, width?: number, height?: number): number => {
  const total = isArea && width && height ? width * height * qty * price : qty * price;
  return Math.round(total);
};

const calculateGenericSubtotal = (price: number, qty: number, isArea: boolean, width?: number, height?: number): number => {
  return Math.round(isArea && width && height ? width * height * qty * price : qty * price);
};

const pricingUnitLabel = (unit: string) =>
  ({
    per_lembar: "/lembar",
    per_meter: "/m2",
    per_cm: "/cm2",
    per_pcs: "/pcs",
  })[unit] || "";
const NO_LAMINATION_FINISHING_CODE = "fns-009";
const PRODUCT_FINISHING_UNSELECTED = "__unselected__";
const PRODUCT_FINISHING_NONE = "__none__";
const DISPLAY_MATERIAL_NONE = "__none__";

type ServiceGroupKey = "a3" | "m2";
type ServiceGroup = {
  key: ServiceGroupKey;
  label: string;
  options: ServiceCatalog[];
};
type DisplayGroup = {
  key: string;
  label: string;
  options: DisplayCatalog[];
};
type ProductMaterialOption = {
  materialId: string;
  materialCode: string | null;
  materialName: string;
  baseVariant: MaterialVariant | null;
};
type ProductFinishingOption = {
  finishingValue: string;
  finishingId: string | null;
  finishingName: string;
  sellingPrice: number;
  unitName: string | null;
};

const normalizeText = (value?: string | null): string => (value ?? "").trim().toLowerCase();
const unitSuffixFromName = (value?: string | null): string => {
  const unitName = value?.trim();
  return unitName ? `/${unitName}` : "";
};
const normalizeDisplayMaterialValue = (materialId?: string | null): string => materialId ?? DISPLAY_MATERIAL_NONE;

const compareByCodeThenName = (a: { code?: string | null; name: string }, b: { code?: string | null; name: string }): number => {
  const codeA = (a.code ?? "").trim();
  const codeB = (b.code ?? "").trim();
  if (codeA && codeB) return codeA.localeCompare(codeB, "en", { numeric: true, sensitivity: "base" });
  if (codeA) return -1;
  if (codeB) return 1;
  return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
};

const buildProductMaterialOptions = (product: Product): ProductMaterialOption[] => {
  const grouped = new Map<string, MaterialVariant[]>();
  product.materialVariants.forEach((variant) => {
    const list = grouped.get(variant.materialId) ?? [];
    list.push(variant);
    grouped.set(variant.materialId, list);
  });

  return [...grouped.entries()]
    .map(([materialId, variants]) => {
      const sorted = [...variants].sort((a, b) => (a.code ?? "").localeCompare(b.code ?? "", "en", { numeric: true, sensitivity: "base" }));
      const baseVariant =
        sorted.find((variant) => normalizeText(variant.finishing?.code) === NO_LAMINATION_FINISHING_CODE) ??
        sorted.find((variant) => !variant.finishingId) ??
        sorted[0];
      const materialCode = baseVariant?.material?.code ?? sorted.find((item) => item.material?.code)?.material?.code ?? null;
      const materialName = baseVariant?.material?.name ?? baseVariant?.name ?? "-";
      return { materialId, materialCode, materialName, baseVariant: baseVariant ?? null };
    })
    .sort((a, b) => compareByCodeThenName({ code: a.materialCode, name: a.materialName }, { code: b.materialCode, name: b.materialName }));
};

const isCuttingPrintNCutService = (service: ServiceCatalog): boolean => {
  const productName = normalizeText(service.product?.name);
  return productName.includes("cutting/print n cut") || productName.includes("cutting print n cut");
};

const resolveServiceGroupKey = (service: ServiceCatalog): ServiceGroupKey | null => {
  const unitName = normalizeText(service.unit?.name);
  if (unitName === "a3") return "a3";
  if (unitName === "m2") return "m2";
  return null;
};

export default function POS() {
  const { data: categories = [] } = useCategories({ activeOnly: true });
  const { data: products = [] } = useProducts({ activeOnly: true });
  const { data: services = [] } = useServices({ activeOnly: true });
  const { data: displays = [] } = useDisplays({ activeOnly: true });
  const createOrder = useCreateOrder();

  const [activeType, setActiveType] = useState<TransactionItemType>("produk");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedServiceGroup, setSelectedServiceGroup] = useState<ServiceGroup | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceCatalog | null>(null);
  const [selectedServiceMaterialId, setSelectedServiceMaterialId] = useState("");
  const [selectedServiceFinishingId, setSelectedServiceFinishingId] = useState("");
  const [selectedDisplayGroup, setSelectedDisplayGroup] = useState<DisplayGroup | null>(null);
  const [selectedDisplayMaterialId, setSelectedDisplayMaterialId] = useState("");
  const [selectedDisplayFinishingId, setSelectedDisplayFinishingId] = useState("");
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayCatalog | null>(null);
  const [itemMaterial, setItemMaterial] = useState("");
  const [selectedProductFinishingId, setSelectedProductFinishingId] = useState(PRODUCT_FINISHING_UNSELECTED);
  const [itemQty, setItemQty] = useState(1);
  const [itemWidth, setItemWidth] = useState(1);
  const [itemHeight, setItemHeight] = useState(1);
  const [itemNotes, setItemNotes] = useState("");
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
    let filtered = products.filter((item) => item.materialVariants.length > 0);
    if (searchQuery) filtered = filtered.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return filtered;
  }, [products, searchQuery]);

  const productMaterialOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return buildProductMaterialOptions(selectedProduct);
  }, [selectedProduct]);

  const selectedProductMaterialOption = useMemo(
    () => productMaterialOptions.find((option) => option.materialId === itemMaterial) ?? productMaterialOptions[0] ?? null,
    [productMaterialOptions, itemMaterial],
  );

  const productFinishingOptions = useMemo(() => {
    if (!selectedProduct || !selectedProductMaterialOption) return [];
    const map = new Map<string, ProductFinishingOption>();
    selectedProduct.materialVariants
      .filter((variant) => variant.materialId === selectedProductMaterialOption.materialId)
      .forEach((variant) => {
        const finishingId = variant.finishingId ?? null;
        const finishingValue = finishingId ?? PRODUCT_FINISHING_NONE;
        if (!map.has(finishingValue)) {
          map.set(finishingValue, {
            finishingValue,
            finishingId,
            finishingName: variant.finishing?.name ?? "Tanpa Finishing",
            sellingPrice: variant.sellingPrice,
            unitName: variant.unit?.name ?? selectedProduct.unit?.name ?? null,
          });
        }
      });
    return [...map.values()].sort((a, b) => a.finishingName.localeCompare(b.finishingName, "id", { sensitivity: "base" }));
  }, [selectedProduct, selectedProductMaterialOption]);

  const selectedProductVariant = useMemo(() => {
    if (!selectedProduct || !selectedProductMaterialOption) return null;
    if (selectedProductFinishingId === PRODUCT_FINISHING_UNSELECTED) return null;
    const selectedFinishingId = selectedProductFinishingId === PRODUCT_FINISHING_NONE ? null : selectedProductFinishingId;
    return (
      selectedProduct.materialVariants.find(
        (variant) =>
          variant.materialId === selectedProductMaterialOption.materialId &&
          (variant.finishingId ?? null) === selectedFinishingId,
      ) ?? null
    );
  }, [selectedProduct, selectedProductMaterialOption, selectedProductFinishingId]);

  const serviceGroups = useMemo(() => {
    const grouped = new Map<ServiceGroupKey, ServiceCatalog[]>();
    services.forEach((service) => {
      if (!isCuttingPrintNCutService(service)) return;
      const key = resolveServiceGroupKey(service);
      if (!key) return;
      const list = grouped.get(key) ?? [];
      list.push(service);
      grouped.set(key, list);
    });

    const meta: Array<{ key: ServiceGroupKey; label: string }> = [
      { key: "a3", label: "Jasa Cutting/Print n Cut A3" },
      { key: "m2", label: "Jasa Cutting/Print n Cut m2" },
    ];

    return meta
      .map((item) => ({
        key: item.key,
        label: item.label,
        options: [...(grouped.get(item.key) ?? [])].sort((a, b) =>
          a.code.localeCompare(b.code, "en", { numeric: true, sensitivity: "base" }),
        ),
      }))
      .filter((item) => item.options.length > 0);
  }, [services]);

  const filteredServiceGroups = useMemo(() => {
    if (!searchQuery) return serviceGroups;
    const key = searchQuery.toLowerCase();
    return serviceGroups.filter(
      (group) =>
        group.label.toLowerCase().includes(key) ||
        group.options.some((option) => option.code.toLowerCase().includes(key)),
    );
  }, [serviceGroups, searchQuery]);

  const displayGroups = useMemo(() => {
    const grouped = new Map<string, DisplayGroup>();
    displays.forEach((display) => {
      const key = `${display.productId}:${normalizeText(display.name)}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.options.push(display);
      } else {
        grouped.set(key, {
          key,
          label: display.name,
          options: [display],
        });
      }
    });

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        options: [...group.options].sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true, sensitivity: "base" })),
      }))
      .sort((a, b) => {
        const codeA = a.options[0]?.code ?? a.label;
        const codeB = b.options[0]?.code ?? b.label;
        return codeA.localeCompare(codeB, "en", { numeric: true, sensitivity: "base" });
      });
  }, [displays]);

  const filteredDisplayGroups = useMemo(() => {
    if (!searchQuery) return displayGroups;
    const key = searchQuery.toLowerCase();
    return displayGroups.filter(
      (group) =>
        group.label.toLowerCase().includes(key) ||
        group.options.some(
          (option) =>
            option.code.toLowerCase().includes(key) ||
            option.material?.name.toLowerCase().includes(key) ||
            option.finishing?.name.toLowerCase().includes(key),
        ),
    );
  }, [displayGroups, searchQuery]);

  const serviceMaterialOptions = useMemo(() => {
    if (!selectedServiceGroup) return [];
    const map = new Map<string, NonNullable<ServiceCatalog["serviceMaterial"]>>();
    selectedServiceGroup.options.forEach((option) => {
      if (option.serviceMaterial && !map.has(option.serviceMaterialId)) {
        map.set(option.serviceMaterialId, option.serviceMaterial);
      }
    });
    return [...map.entries()].map(([id, material]) => ({ id, material }));
  }, [selectedServiceGroup]);

  const serviceFinishingOptions = useMemo(() => {
    if (!selectedServiceGroup || !selectedServiceMaterialId) return [];
    const map = new Map<string, NonNullable<ServiceCatalog["finishing"]>>();
    selectedServiceGroup.options
      .filter((option) => option.serviceMaterialId === selectedServiceMaterialId)
      .forEach((option) => {
        if (option.finishing && !map.has(option.finishingId)) {
          map.set(option.finishingId, option.finishing);
        }
      });
    return [...map.entries()].map(([id, finishing]) => ({ id, finishing }));
  }, [selectedServiceGroup, selectedServiceMaterialId]);

  const displayMaterialOptions = useMemo(() => {
    if (!selectedDisplayGroup) return [];
    const map = new Map<string, string>();
    selectedDisplayGroup.options.forEach((option) => {
      const key = normalizeDisplayMaterialValue(option.materialId);
      if (!map.has(key)) {
        map.set(key, option.material?.name ?? "Tanpa Bahan");
      }
    });
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [selectedDisplayGroup]);

  const displayFinishingOptions = useMemo(() => {
    if (!selectedDisplayGroup || !selectedDisplayMaterialId) return [];
    const map = new Map<string, NonNullable<DisplayCatalog["finishing"]>>();
    selectedDisplayGroup.options
      .filter((option) => normalizeDisplayMaterialValue(option.materialId) === selectedDisplayMaterialId)
      .forEach((option) => {
        if (option.finishing && !map.has(option.finishingId)) {
          map.set(option.finishingId, option.finishing);
        }
      });
    return [...map.entries()].map(([id, finishing]) => ({ id, finishing }));
  }, [selectedDisplayGroup, selectedDisplayMaterialId]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const grandTotal = Math.max(cartTotal - discount, 0);
  const changeAmount = amountPaid - grandTotal;
  const formattedAmountPaid = amountPaid.toLocaleString("id-ID");
  const isCashUnderpaid = paymentMethod === "cash" && amountPaid < grandTotal;

  const resetItemForm = () => {
    setItemMaterial("");
    setSelectedProductFinishingId(PRODUCT_FINISHING_UNSELECTED);
    setItemQty(1);
    setItemWidth(1);
    setItemHeight(1);
    setItemNotes("");
  };

  const openAddProduct = (product: Product) => {
    const initialMaterialId = buildProductMaterialOptions(product)[0]?.materialId ?? "";
    setSelectedProduct(product);
    setSelectedServiceGroup(null);
    setSelectedService(null);
    setSelectedServiceMaterialId("");
    setSelectedServiceFinishingId("");
    setSelectedDisplayGroup(null);
    setSelectedDisplayMaterialId("");
    setSelectedDisplayFinishingId("");
    setSelectedDisplay(null);
    setItemMaterial(initialMaterialId);
    setSelectedProductFinishingId(PRODUCT_FINISHING_UNSELECTED);
    setItemQty(1);
    setItemWidth(1);
    setItemHeight(1);
    setItemNotes("");
    setAddItemOpen(true);
  };

  const openAddServiceGroup = (group: ServiceGroup) => {
    setSelectedProduct(null);
    setSelectedServiceGroup(group);
    const firstOption = group.options[0] ?? null;
    setSelectedService(firstOption);
    setSelectedServiceMaterialId(firstOption?.serviceMaterialId ?? "");
    setSelectedServiceFinishingId(firstOption?.finishingId ?? "");
    setSelectedDisplayGroup(null);
    setSelectedDisplayMaterialId("");
    setSelectedDisplayFinishingId("");
    setSelectedDisplay(null);
    resetItemForm();
    setAddItemOpen(true);
  };

  const openAddDisplayGroup = (group: DisplayGroup) => {
    setSelectedProduct(null);
    setSelectedServiceGroup(null);
    setSelectedService(null);
    setSelectedServiceMaterialId("");
    setSelectedServiceFinishingId("");
    setSelectedDisplayGroup(group);
    const firstOption = group.options[0] ?? null;
    setSelectedDisplay(firstOption);
    setSelectedDisplayMaterialId(firstOption ? normalizeDisplayMaterialValue(firstOption.materialId) : "");
    setSelectedDisplayFinishingId(firstOption?.finishingId ?? "");
    resetItemForm();
    setAddItemOpen(true);
  };

  const handleSelectProductMaterial = (materialId: string) => {
    setItemMaterial(materialId);
    setSelectedProductFinishingId(PRODUCT_FINISHING_UNSELECTED);
  };

  const handleSelectServiceMaterial = (materialId: string) => {
    setSelectedServiceMaterialId(materialId);
    if (!selectedServiceGroup) {
      setSelectedServiceFinishingId("");
      setSelectedService(null);
      return;
    }
    const firstMatch = selectedServiceGroup.options.find((option) => option.serviceMaterialId === materialId) ?? null;
    setSelectedServiceFinishingId(firstMatch?.finishingId ?? "");
    setSelectedService(firstMatch);
  };

  const handleSelectServiceFinishing = (finishingId: string) => {
    setSelectedServiceFinishingId(finishingId);
    if (!selectedServiceGroup) {
      setSelectedService(null);
      return;
    }
    const match =
      selectedServiceGroup.options.find(
        (option) => option.serviceMaterialId === selectedServiceMaterialId && option.finishingId === finishingId,
      ) ?? null;
    setSelectedService(match);
  };

  const handleSelectDisplayMaterial = (materialId: string) => {
    setSelectedDisplayMaterialId(materialId);
    if (!selectedDisplayGroup) {
      setSelectedDisplayFinishingId("");
      setSelectedDisplay(null);
      return;
    }
    const firstMatch = selectedDisplayGroup.options.find((option) => normalizeDisplayMaterialValue(option.materialId) === materialId) ?? null;
    setSelectedDisplayFinishingId(firstMatch?.finishingId ?? "");
    setSelectedDisplay(firstMatch);
  };

  const handleSelectDisplayFinishing = (finishingId: string) => {
    setSelectedDisplayFinishingId(finishingId);
    if (!selectedDisplayGroup) {
      setSelectedDisplay(null);
      return;
    }
    const match =
      selectedDisplayGroup.options.find(
        (option) => normalizeDisplayMaterialValue(option.materialId) === selectedDisplayMaterialId && option.finishingId === finishingId,
      ) ?? null;
    setSelectedDisplay(match);
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((item) => item.id !== id));
  const openPaymentDialog = () => {
    setAmountPaid(grandTotal);
    setPaymentOpen(true);
  };

  const selectedProductUnitName =
    selectedProductVariant?.unit?.name ?? selectedProductMaterialOption?.baseVariant?.unit?.name ?? selectedProduct?.unit?.name;
  const productAreaMode = Boolean(selectedProduct?.hasCustomSize) && isAreaUnitName(selectedProductUnitName);
  const dialogType: TransactionItemType | null = selectedProduct ? "produk" : selectedServiceGroup ? "jasa" : selectedDisplayGroup ? "display" : null;
  const dialogAreaMode =
    dialogType === "produk" ? productAreaMode : dialogType === "jasa" ? isAreaUnitName(selectedService?.unit?.name) : dialogType === "display" ? isAreaUnitName(selectedDisplay?.unit?.name) : false;
  const dialogPrice =
    dialogType === "produk"
      ? selectedProductVariant?.sellingPrice ?? 0
      : dialogType === "jasa"
        ? selectedService?.sellingPrice ?? 0
        : dialogType === "display"
          ? selectedDisplay?.sellingPrice ?? 0
          : 0;
  const dialogEstimate =
    dialogType === "produk" && selectedProduct
      ? calculateProductSubtotal(dialogPrice, itemQty, productAreaMode, itemWidth, itemHeight)
      : calculateGenericSubtotal(dialogPrice, itemQty, Boolean(dialogAreaMode), itemWidth, itemHeight);

  const addToCart = () => {
    if (selectedProduct) {
      if (productMaterialOptions.length === 0) {
        toast.error("Produk tidak memiliki varian bahan aktif");
        return;
      }
      if (productFinishingOptions.length === 0) {
        toast.error("Finishing untuk bahan ini tidak tersedia");
        return;
      }
      if (selectedProductFinishingId === PRODUCT_FINISHING_UNSELECTED) {
        toast.error("Pilih finishing terlebih dahulu");
        return;
      }
      const material = selectedProductVariant;
      if (!material) {
        toast.error("Kombinasi bahan dan finishing tidak ditemukan");
        return;
      }
      if (productAreaMode && (!itemWidth || !itemHeight)) {
        toast.error("Panjang dan lebar wajib diisi");
        return;
      }
      const price = material.sellingPrice;
      const subtotal = calculateProductSubtotal(price, itemQty, productAreaMode, itemWidth, itemHeight);
      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          itemType: "produk",
          product: selectedProduct,
          selectedMaterial: material,
          quantity: itemQty,
          width: productAreaMode ? itemWidth : undefined,
          height: productAreaMode ? itemHeight : undefined,
          notes: itemNotes,
          finishing: false,
          subtotal,
        },
      ]);
      setAddItemOpen(false);
      toast.success(`${selectedProduct.name} ditambahkan ke keranjang`);
      return;
    }

    if (selectedServiceGroup && !selectedService) {
      toast.error("Kombinasi material dan finishing jasa belum valid");
      return;
    }

    if (selectedService) {
      const areaMode = isAreaUnitName(selectedService.unit?.name);
      if (areaMode && (!itemWidth || !itemHeight)) return toast.error("Panjang dan lebar wajib diisi");
      const subtotal = calculateGenericSubtotal(selectedService.sellingPrice, itemQty, areaMode, itemWidth, itemHeight);
      const product =
        products.find((item) => item.id === selectedService.productId) ??
        createFallbackProduct(selectedService.productId, selectedService.product?.name ?? selectedService.code, selectedService.categoryId);
      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          itemType: "jasa",
          product,
          selectedMaterial: null,
          selectedService,
          quantity: itemQty,
          width: areaMode ? itemWidth : undefined,
          height: areaMode ? itemHeight : undefined,
          notes: itemNotes,
          finishing: false,
          subtotal,
        },
      ]);
      setAddItemOpen(false);
      toast.success(`${selectedServiceGroup?.label ?? selectedService.code} ditambahkan ke keranjang`);
      return;
    }

    if (selectedDisplayGroup && !selectedDisplay) {
      toast.error("Kombinasi bahan dan finishing display belum valid");
      return;
    }

    if (selectedDisplay) {
      const areaMode = isAreaUnitName(selectedDisplay.unit?.name);
      if (itemQty < selectedDisplay.minimumOrder) return toast.error(`Minimal order ${selectedDisplay.minimumOrder}`);
      if (areaMode && (!itemWidth || !itemHeight)) return toast.error("Panjang dan lebar wajib diisi");
      const subtotal = calculateGenericSubtotal(selectedDisplay.sellingPrice, itemQty, areaMode, itemWidth, itemHeight);
      const product =
        products.find((item) => item.id === selectedDisplay.productId) ??
        createFallbackProduct(selectedDisplay.productId, selectedDisplay.product?.name ?? selectedDisplay.name, selectedDisplay.categoryId);
      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          itemType: "display",
          product,
          selectedMaterial: null,
          selectedDisplay,
          quantity: itemQty,
          width: areaMode ? itemWidth : undefined,
          height: areaMode ? itemHeight : undefined,
          notes: itemNotes,
          finishing: false,
          subtotal,
        },
      ]);
      setAddItemOpen(false);
      toast.success(`${selectedDisplayGroup?.label ?? selectedDisplay.name} ditambahkan ke keranjang`);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const normalizedPhone = normalizedCustomerPhone;
    const trimmedName = customerName.trim();
    if (!trimmedName || !normalizedPhone) return toast.error("Nama dan nomor telepon pelanggan wajib diisi");
    if (!/^0\d{8,14}$/.test(normalizedPhone)) return toast.error("Format nomor telepon tidak valid");
    if (isCashUnderpaid) return toast.error("Nominal bayar kurang dari total belanja");

    try {
      await createOrder.mutateAsync({
        customerName: trimmedName,
        customerPhone: normalizedPhone,
        paymentMethod,
        discount,
        tax: 0,
        notes: "",
        items: cart.map((item) => {
          if (item.itemType === "produk") {
            return {
              itemType: "produk" as const,
              productId: item.product.id,
              variantId: item.selectedMaterial?.id ?? item.product.materialVariants[0]?.id ?? "",
              quantity: item.quantity,
              width: item.width,
              height: item.height,
              notes: item.notes,
              finishing: item.finishing,
            };
          }
          if (item.itemType === "jasa") {
            return {
              itemType: "jasa" as const,
              productId: item.product.id,
              serviceId: item.selectedService?.id ?? "",
              quantity: item.quantity,
              width: item.width,
              height: item.height,
              notes: item.notes,
              finishing: false as const,
            };
          }
          return {
            itemType: "display" as const,
            productId: item.product.id,
            displayId: item.selectedDisplay?.id ?? "",
            quantity: item.quantity,
            width: item.width,
            height: item.height,
            notes: item.notes,
            finishing: false as const,
          };
        }),
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)] animate-fade-in">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(["produk", "jasa", "display"] as TransactionItemType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeType === type ? "bg-primary text-primary-foreground shadow-md" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {typeLabel[type]}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <Input placeholder={`Cari ${typeLabel[activeType]}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-card" />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-max">
          {activeType === "produk" &&
            filteredProducts.map((product) => {
              const categoryIcon = sanitizeCategoryIcon(categories.find((category) => category.id === product.categoryId)?.icon);
              const minPrice = Math.min(...product.materialVariants.map((variant) => variant.sellingPrice));
              const variantUnitNames = [
                ...new Set(product.materialVariants.map((variant) => variant.unit?.name?.trim()).filter((name): name is string => Boolean(name))),
              ];
              const productUnitLabel =
                variantUnitNames.length === 1 ? unitSuffixFromName(variantUnitNames[0]) : variantUnitNames.length > 1 ? "/varian" : pricingUnitLabel(product.pricingUnit);
              return (
                <button key={product.id} onClick={() => openAddProduct(product)} className="pos-product-card text-left">
                  {categoryIcon ? <div className="text-2xl mb-2">{categoryIcon}</div> : null}
                <h4 className="font-semibold text-sm text-foreground leading-tight">{product.name}</h4>
                <p className="text-primary font-bold text-sm mt-1">
                  Mulai {formatCurrency(minPrice)}
                  <span className="text-muted-foreground font-normal text-xs">{productUnitLabel}</span>
                </p>
                </button>
              );
            })}
          {activeType === "jasa" &&
            filteredServiceGroups.map((group) => {
              const minPrice = Math.min(...group.options.map((item) => item.sellingPrice));
              return (
                <button key={group.key} onClick={() => openAddServiceGroup(group)} className="pos-product-card text-left">
                  <span className={`badge-status ${typeBadgeClass.jasa}`}>Jasa</span>
                  <h4 className="font-semibold text-sm text-foreground leading-tight mt-2">{group.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{group.options.length} kombinasi material/finishing</p>
                  <p className="text-primary font-bold text-sm mt-1">
                    Mulai {formatCurrency(minPrice)}
                    <span className="text-muted-foreground font-normal text-xs">/{group.key.toUpperCase()}</span>
                  </p>
                </button>
              );
            })}
          {activeType === "display" &&
            filteredDisplayGroups.map((group) => {
              const minPrice = Math.min(...group.options.map((item) => item.sellingPrice));
              const unitName = group.options[0]?.unit?.name ?? "-";
              return (
              <button key={group.key} onClick={() => openAddDisplayGroup(group)} className="pos-product-card text-left">
                <span className={`badge-status ${typeBadgeClass.display}`}>Display</span>
                <h4 className="font-semibold text-sm text-foreground leading-tight mt-2">{group.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{group.options.length} kombinasi bahan/finishing</p>
                <p className="text-primary font-bold text-sm mt-1">
                  Mulai {formatCurrency(minPrice)}
                  <span className="text-muted-foreground font-normal text-xs">/{unitName}</span>
                </p>
              </button>
              );
            })}
        </div>
      </div>

      <div className="w-full lg:w-80 lg:shrink-0 flex flex-col bg-card rounded-xl border border-border shadow-sm p-4 min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Keranjang</h3>
          <span className="ml-auto text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">{cart.length} item</span>
        </div>
        <div className="pos-cart-scroll flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">Belum ada item. Klik item untuk menambahkan.</div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="pos-cart-item">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.itemType === "produk" ? item.product.name : item.itemType === "jasa" ? item.selectedService?.code : item.selectedDisplay?.name}
                    </p>
                    <span className={`badge-status ${typeBadgeClass[item.itemType]}`}>{typeLabel[item.itemType]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity}x
                    {item.width && item.height ? ` | ${item.width}x${item.height}` : ""}
                    {` | ${formatCurrency(item.subtotal)}`}
                  </p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="p-1 text-destructive/70 hover:text-destructive rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
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
            <DialogTitle>
              Tambah{" "}
              {dialogType === "produk"
                ? selectedProduct?.name
                : dialogType === "jasa"
                  ? selectedServiceGroup?.label
                  : dialogType === "display"
                    ? selectedDisplayGroup?.label
                    : "Item"}
            </DialogTitle>
          </DialogHeader>
          {dialogType && (
            <div className="space-y-4">
              {dialogType === "jasa" && selectedServiceGroup ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Material</label>
                    <Select value={selectedServiceMaterialId} onValueChange={handleSelectServiceMaterial}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih material" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceMaterialOptions.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.material.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Finishing</label>
                    <Select value={selectedServiceFinishingId} onValueChange={handleSelectServiceFinishing}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih finishing" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceFinishingOptions.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.finishing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}

              {dialogType === "display" && selectedDisplayGroup ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Bahan</label>
                    <Select value={selectedDisplayMaterialId} onValueChange={handleSelectDisplayMaterial}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bahan" />
                      </SelectTrigger>
                      <SelectContent>
                        {displayMaterialOptions.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Finishing</label>
                    <Select value={selectedDisplayFinishingId} onValueChange={handleSelectDisplayFinishing}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih finishing" />
                      </SelectTrigger>
                      <SelectContent>
                        {displayFinishingOptions.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.finishing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}

              {dialogType === "produk" && selectedProduct ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Bahan</label>
                    <Select value={itemMaterial} onValueChange={handleSelectProductMaterial}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bahan" />
                      </SelectTrigger>
                      <SelectContent>
                        {productMaterialOptions.map((material) => (
                          <SelectItem key={material.materialId} value={material.materialId}>
                            {material.materialName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Tambah Finishing</label>
                    <Select
                      value={selectedProductFinishingId === PRODUCT_FINISHING_UNSELECTED ? undefined : selectedProductFinishingId}
                      onValueChange={setSelectedProductFinishingId}
                      disabled={productFinishingOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih finishing" />
                      </SelectTrigger>
                        <SelectContent>
                          {productFinishingOptions.map((option) => (
                          <SelectItem key={option.finishingValue} value={option.finishingValue}>
                            {option.finishingName} - {formatCurrency(option.sellingPrice)}
                            {unitSuffixFromName(option.unitName)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Jumlah</label>
                <Input
                  type="number"
                  min={dialogType === "display" ? Math.max(selectedDisplay?.minimumOrder ?? 1, 1) : 1}
                  value={itemQty}
                  onChange={(e) => setItemQty(Number(e.target.value))}
                />
              </div>

              {dialogAreaMode ? (
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
              ) : null}


              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Catatan</label>
                <Textarea value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} rows={2} />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimasi harga:</span>
                  <span className="font-bold text-primary text-lg">{formatCurrency(dialogEstimate)}</span>
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
              {existingCustomer ? (
                <div className="mt-2">
                  <span className="badge-status bg-warning/10 text-warning">Pelanggan lama</span>
                </div>
              ) : null}
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
              {discount > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="text-destructive">-{formatCurrency(discount)}</span>
                </div>
              ) : null}
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
