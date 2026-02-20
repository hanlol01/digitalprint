import { useMemo, useState } from "react";
import { ChevronRight, Filter, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUS_CONFIG, PAYMENT_METHOD_LABELS, type Order, type OrderStatus, type PaymentMethod } from "@/types";
import { toast } from "sonner";

const statusSteps: OrderStatus[] = ["menunggu_desain", "proses_cetak", "finishing", "selesai", "sudah_diambil"];
const settlementMethods: PaymentMethod[] = ["cash", "transfer", "qris"];

const getPaymentStatus = (order: Order) => (order.paymentMethod === "piutang" ? "belum_lunas" : "lunas");
type PaymentFilter = "all" | "lunas" | "belum_lunas";

export default function Orders() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementOrder, setSettlementOrder] = useState<Order | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<PaymentMethod>("cash");

  const { data: orders = [], isLoading } = useOrders({ search, status: filterStatus });
  const updateStatus = useUpdateOrderStatus();

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

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, paymentMethod?: PaymentMethod) => {
    try {
      const updated = await updateStatus.mutateAsync({ id: orderId, status: newStatus, paymentMethod });
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
      setSettlementOpen(true);
      return;
    }

    await handleUpdateStatus(order.id, step);
  };

  const handleConfirmSettlement = async () => {
    if (!settlementOrder) return;

    await handleUpdateStatus(settlementOrder.id, "sudah_diambil", settlementMethod);
    setSettlementOpen(false);
    setSettlementOrder(null);
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

      <div className="space-y-2">
        {isLoading && <div className="text-center py-8 text-muted-foreground">Memuat pesanan...</div>}
        {!isLoading &&
          filteredOrders.map((order) => {
            const statusConfig = ORDER_STATUS_CONFIG[order.status];
            const isPaid = getPaymentStatus(order) === "lunas";

            return (
              <div key={order.id} onClick={() => setSelectedOrder(order)} className="stat-card cursor-pointer flex items-center gap-4 !p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">{order.orderNumber}</span>
                    <span className={`badge-status bg-${statusConfig.color}/10 text-${statusConfig.color}`}>{statusConfig.label}</span>
                    <span className={`badge-status ${isPaid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {isPaid ? "Lunas" : "Belum Lunas"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName} | {order.customerPhone}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Deadline: {order.deadline ? new Date(order.deadline).toLocaleDateString("id-ID") : "-"} | {order.notes || "-"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-muted-foreground">{order.estimatedMinutes} menit</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        {!isLoading && filteredOrders.length === 0 && <div className="text-center py-12 text-muted-foreground">Tidak ada order ditemukan.</div>}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Order {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Pelanggan</p>
                  <p className="font-medium text-foreground">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telepon</p>
                  <p className="font-medium text-foreground">{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deadline</p>
                  <p className="font-medium text-foreground">
                    {selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleDateString("id-ID") : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimasi</p>
                  <p className="font-medium text-foreground">{selectedOrder.estimatedMinutes} menit</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status Pembayaran</p>
                  <p className={getPaymentStatus(selectedOrder) === "lunas" ? "font-medium text-success" : "font-medium text-destructive"}>
                    {getPaymentStatus(selectedOrder) === "lunas" ? "Lunas" : "Belum Lunas"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Metode Pembayaran</p>
                  <p className="font-medium text-foreground">{PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod]}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{selectedOrder.notes || "-"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-3">Status Order</p>
                <div className="flex items-center gap-1">
                  {statusSteps.map((step, index) => {
                    const currentIndex = statusSteps.indexOf(selectedOrder.status);
                    const isActive = index <= currentIndex;
                    const config = ORDER_STATUS_CONFIG[step];
                    return (
                      <div key={step} className="flex-1 flex flex-col items-center">
                        <button
                          onClick={() => handleStatusClick(selectedOrder, step)}
                          className={`w-full h-2 rounded-full transition-all ${isActive ? "bg-primary" : "bg-muted"}`}
                        />
                        <span className={`text-[10px] mt-1 ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>{config.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSettlementOpen(false);
                  setSettlementOrder(null);
                }}
              >
                Batal
              </Button>
              <Button type="button" onClick={handleConfirmSettlement} disabled={updateStatus.isPending}>
                {updateStatus.isPending ? "Menyimpan..." : "Lunasi & Sudah Diambil"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
