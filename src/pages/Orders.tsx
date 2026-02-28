import { useMemo, useState } from "react";
import { Eye, Filter, Search, User, Phone, Calendar, Clock, CreditCard, Wallet, Package, FileText, ShoppingBag, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUS_CONFIG, PAYMENT_METHOD_LABELS, type Order, type OrderStatus, type PaymentMethod, type TransactionItemType } from "@/types";
import { toast } from "sonner";

const statusSteps: OrderStatus[] = ["menunggu_desain", "proses_cetak", "finishing", "selesai", "sudah_diambil"];
const settlementMethods: PaymentMethod[] = ["cash", "transfer", "qris"];
const transactionTypes: Array<"all" | TransactionItemType> = ["all", "produk", "jasa", "display"];
const transactionTypeLabel: Record<"all" | TransactionItemType, string> = {
  all: "Semua Tipe",
  produk: "Produk",
  jasa: "Jasa",
  display: "Display",
};
const transactionTypeBadgeClass: Record<TransactionItemType, string> = {
  produk: "bg-primary/10 text-primary",
  jasa: "bg-info/10 text-info",
  display: "bg-warning/10 text-warning",
};

const parseCurrencyInput = (value: string): number => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};
const getRemainingAmount = (order: Order) => Math.max(Number(order.remainingAmount ?? 0), 0);
const getPaymentStatus = (order: Order) => (getRemainingAmount(order) > 0 ? "belum_lunas" : "lunas");
type PaymentFilter = "all" | "lunas" | "belum_lunas";

export default function Orders() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<PaymentFilter>("all");
  const [filterItemType, setFilterItemType] = useState<"all" | TransactionItemType>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementOrder, setSettlementOrder] = useState<Order | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<PaymentMethod>("cash");
  const [settlementAmount, setSettlementAmount] = useState(0);

  const { data: orders = [], isLoading } = useOrders({ search, status: filterStatus, itemType: filterItemType });
  const updateStatus = useUpdateOrderStatus();
  const settlementRemainingAmount = settlementOrder ? getRemainingAmount(settlementOrder) : 0;
  const formattedSettlementAmount = settlementAmount.toLocaleString("id-ID");
  const isSettlementInvalid = !settlementOrder || settlementAmount !== settlementRemainingAmount;

  const filteredOrders = useMemo(() => {
    if (filterPayment === "all") return orders;
    return orders.filter((order) => getPaymentStatus(order) === filterPayment);
  }, [orders, filterPayment]);

  const statusCountMap = useMemo(() => {
    const result = new Map<OrderStatus, number>();
    for (const status of statusSteps) {
      result.set(status, filteredOrders.filter((order) => order.status === status).length);
    }
    return result;
  }, [filteredOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, paymentMethod?: PaymentMethod, settlementAmountValue?: number) => {
    try {
      const updated = await updateStatus.mutateAsync({ id: orderId, status: newStatus, paymentMethod, settlementAmount: settlementAmountValue });
      setSelectedOrder(updated);
      toast.success(`Status diperbarui ke "${ORDER_STATUS_CONFIG[newStatus].label}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status");
    }
  };

  const handleStatusClick = async (order: Order, step: OrderStatus) => {
    const isNeedSettlement = step === "sudah_diambil" && getPaymentStatus(order) === "belum_lunas";
    if (isNeedSettlement) {
      setSettlementMethod("cash");
      setSettlementOrder(order);
      setSettlementAmount(getRemainingAmount(order));
      setSettlementOpen(true);
      return;
    }

    await handleUpdateStatus(order.id, step);
  };

  const handleConfirmSettlement = async () => {
    if (!settlementOrder) return;
    if (isSettlementInvalid) return toast.error("Nominal pelunasan harus sama dengan sisa pembayaran");

    await handleUpdateStatus(settlementOrder.id, "sudah_diambil", settlementMethod, settlementAmount);
    setSettlementOpen(false);
    setSettlementOrder(null);
    setSettlementAmount(0);
  };

  const handleDeleteOrder = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    // TODO: Implement delete logic with your API/hook
    toast.success(`Order ${order.orderNumber} dihapus`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari order atau pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48 bg-card">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPayment} onValueChange={(value) => setFilterPayment(value as PaymentFilter)}>
          <SelectTrigger className="w-full sm:w-52 bg-card">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter pembayaran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Pembayaran</SelectItem>
            <SelectItem value="lunas">Lunas</SelectItem>
            <SelectItem value="belum_lunas">Belum Lunas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterItemType} onValueChange={(value) => setFilterItemType(value as "all" | TransactionItemType)}>
          <SelectTrigger className="w-full sm:w-44 bg-card">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter tipe" />
          </SelectTrigger>
          <SelectContent>
            {transactionTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {transactionTypeLabel[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {statusSteps.map((status) => {
          const config = ORDER_STATUS_CONFIG[status];
          const count = statusCountMap.get(status) ?? 0;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className={`p-3 rounded-lg border text-center transition-all ${
                filterStatus === status ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <p className="text-xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* ============ ORDER TABLE ============ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="orders-table">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">No. Order</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Status</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Pembayaran</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Tipe</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Pelanggan</th>
                <th className="text-right font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Total</th>
                <th className="text-center font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Memuat pesanan...
                  </td>
                </tr>
              )}
              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Tidak ada order ditemukan.
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredOrders.map((order) => {
                  const statusConfig = ORDER_STATUS_CONFIG[order.status];
                  const isPaid = getPaymentStatus(order) === "lunas";
                  const orderItemTypes = (order.itemTypes?.length ? order.itemTypes : [...new Set(order.items.map((item) => item.itemType))]) as TransactionItemType[];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-muted/30 transition-colors"
                      data-testid={`order-row-${order.id}`}
                    >
                      {/* No. Order */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-foreground" data-testid={`order-number-${order.id}`}>
                          {order.orderNumber}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`badge-status bg-${statusConfig.color}/10 text-${statusConfig.color}`}
                          data-testid={`order-status-${order.id}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Pembayaran */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`badge-status ${isPaid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                          data-testid={`order-payment-${order.id}`}
                        >
                          {isPaid ? "Lunas" : "Belum Lunas"}
                        </span>
                      </td>

                      {/* Tipe */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {orderItemTypes.map((type) => (
                            <span
                              key={`${order.id}-${type}`}
                              className={`badge-status ${transactionTypeBadgeClass[type]}`}
                            >
                              {transactionTypeLabel[type]}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Pelanggan */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-foreground" data-testid={`order-customer-${order.id}`}>
                            {order.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="font-bold text-foreground" data-testid={`order-total-${order.id}`}>
                          {formatCurrency(order.total)}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => setSelectedOrder(order)}
                            data-testid={`order-view-${order.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteOrder(e, order)}
                            data-testid={`order-delete-${order.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ DETAIL ORDER DIALOG (REDESIGNED) ============ */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="w-[98vw] max-w-[1400px] p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto" data-testid="detail-order-dialog">
          {selectedOrder && (() => {
            const isPaid = getPaymentStatus(selectedOrder) === "lunas";
            const remaining = getRemainingAmount(selectedOrder);
            const currentStatusIndex = statusSteps.indexOf(selectedOrder.status);

            return (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4 border-b border-border/50">
                  <DialogHeader className="space-y-1">
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-lg font-bold text-foreground tracking-tight" data-testid="detail-order-title">
                        {selectedOrder.orderNumber}
                      </DialogTitle>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                        }`}
                        data-testid="detail-payment-status-badge"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-red-500"}`} />
                        {isPaid ? "Lunas" : "Belum Lunas"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Detail informasi pesanan</p>
                  </DialogHeader>
                </div>

                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                    <div className="min-w-0 h-full lg:h-[370px] flex flex-col gap-5">
                      {/* Informasi Pelanggan Card */}
                      <div className="rounded-xl border border-border/ bg-card overflow-hidden flex-1" data-testid="customer-info-card">
                        <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informasi Pelanggan</p>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground font-medium">Pelanggan</p>
                              <p className="text-sm font-semibold text-foreground truncate" data-testid="detail-customer-name">{selectedOrder.customerName}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground font-medium">Telepon</p>
                              <p className="text-sm font-semibold text-foreground" data-testid="detail-customer-phone">{selectedOrder.customerPhone}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground font-medium">Deadline</p>
                              <p className="text-sm font-semibold text-foreground" data-testid="detail-deadline">
                                {selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground font-medium">Estimasi</p>
                              <p className="text-sm font-semibold text-foreground" data-testid="detail-estimation">{selectedOrder.estimatedMinutes} menit</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informasi Pembayaran Card */}
                      <div className="rounded-xl border border-border/60 bg-card overflow-hidden flex-1" data-testid="payment-info-card">
                        <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informasi Pembayaran</p>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground font-medium">Metode</p>
                              <p className="text-sm font-semibold text-foreground" data-testid="detail-payment-method">{PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod]}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Wallet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground font-medium">Total Dibayar</p>
                              <p className="text-sm font-semibold text-foreground" data-testid="detail-paid-amount">{formatCurrency(selectedOrder.paidAmount)}</p>
                            </div>
                          </div>
                          {remaining > 0 && (
                            <div className="col-span-2 flex items-center gap-3 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2.5 border border-red-200/60 dark:border-red-500/20">
                              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                                <Wallet className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-red-600/80 dark:text-red-400/80 font-medium">Sisa Pembayaran</p>
                                <p className="text-sm font-bold text-red-600 dark:text-red-400" data-testid="detail-remaining-amount">{formatCurrency(remaining)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Daftar Item */}
                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden min-w-0 h-full lg:h-[370px] flex flex-col" data-testid="items-list-card">
                      <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40 flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daftar Item</p>
                        <span className="text-[11px] text-muted-foreground font-medium bg-muted rounded-full px-2.5 py-0.5" data-testid="items-total-count">
                          {selectedOrder.items.length} item
                        </span>
                      </div>
                      <div className="divide-y divide-border/40 flex-1 overflow-y-auto">
                        {selectedOrder.items.map((item, index) => (
                          <div key={index} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors min-w-0" data-testid={`order-item-${index}`}>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              item.itemType === "produk"
                                ? "bg-primary/10"
                                : item.itemType === "jasa"
                                ? "bg-info/10"
                                : "bg-warning/10"
                            }`}>
                              {item.itemType === "produk" ? (
                                <Package className="w-4 h-4 text-primary" />
                              ) : item.itemType === "jasa" ? (
                                <ShoppingBag className="w-4 h-4 text-info" />
                              ) : (
                                <ShoppingBag className="w-4 h-4 text-warning" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground truncate" data-testid={`item-name-${index}`}>
                                  {item.name || item.productName || `Item ${index + 1}`}
                                </p>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${transactionTypeBadgeClass[item.itemType]}`}>
                                  {transactionTypeLabel[item.itemType]}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5" data-testid={`item-qty-${index}`}>
                                {item.quantity ?? item.jumlah ?? 1} x {formatCurrency(item.hargaSatuan ?? item.subtotal)}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-foreground shrink-0 text-right min-w-[120px]" data-testid={`item-subtotal-${index}`}>
                              {formatCurrency(item.subtotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Catatan */}
                  {selectedOrder.notes && selectedOrder.notes !== "-" && (
                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden" data-testid="notes-card">
                      <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catatan</p>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground leading-relaxed" data-testid="detail-notes">{selectedOrder.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                    {/* Total */}
                    <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 flex items-center justify-between" data-testid="detail-total-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Total Pesanan</span>
                      </div>
                      <span className="text-xl font-extrabold text-primary tracking-tight" data-testid="detail-total-amount">
                        {formatCurrency(selectedOrder.total)}
                      </span>
                    </div>

                    {/* Status Order */}
                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden" data-testid="status-order-card">
                      <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Order</p>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-1">
                          {statusSteps.map((step, index) => {
                            const isCompleted = index <= currentStatusIndex;
                            const isCurrent = index === currentStatusIndex;
                            const config = ORDER_STATUS_CONFIG[step];
                            return (
                              <div key={step} className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
                                <button
                                  onClick={() => handleStatusClick(selectedOrder, step)}
                                  className={`w-full h-2.5 rounded-full transition-all duration-300 ${
                                    isCompleted
                                      ? isCurrent
                                        ? "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                        : "bg-primary/70"
                                      : "bg-muted hover:bg-muted-foreground/20"
                                  }`}
                                  data-testid={`status-step-${step}`}
                                />
                                <span className={`text-[11px] leading-tight text-center font-medium transition-colors ${
                                  isCompleted ? "text-primary" : "text-muted-foreground"
                                }`}>
                                  {config.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ============ SETTLEMENT DIALOG (UNCHANGED) ============ */}
      <Dialog open={settlementOpen} onOpenChange={setSettlementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pembayaran Belum Lunas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pesanan ini masih <span className="text-destructive font-medium">belum lunas</span>. Pilih metode pembayaran
              pelunasan untuk melanjutkan status ke <span className="font-medium text-foreground">Sudah Diambil</span>.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium text-foreground">{formatCurrency(settlementOrder?.total ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sudah Dibayar</span>
                <span className="font-medium text-foreground">{formatCurrency(settlementOrder?.paidAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Sisa Pembayaran</span>
                <span className="font-semibold text-destructive">{formatCurrency(settlementRemainingAmount)}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {settlementMethods.map((method) => (
                  <button
                    key={method}
                    onClick={() => setSettlementMethod(method)}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      settlementMethod === method ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {PAYMENT_METHOD_LABELS[method]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nominal Pelunasan</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-bold">Rp</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formattedSettlementAmount}
                  onChange={(e) => setSettlementAmount(parseCurrencyInput(e.target.value))}
                  className="text-right"
                />
              </div>
              {isSettlementInvalid ? (
                <p className="text-xs text-destructive mt-1">Nominal pelunasan harus sama dengan sisa pembayaran.</p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSettlementOpen(false);
                  setSettlementOrder(null);
                  setSettlementAmount(0);
                }}
              >
                Batal
              </Button>
              <Button type="button" onClick={handleConfirmSettlement} disabled={updateStatus.isPending || isSettlementInvalid}>
                {updateStatus.isPending ? "Menyimpan..." : "Lunasi & Sudah Diambil"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

