import { useState } from 'react';
import { mockOrders, formatCurrency } from '@/data/mockData';
import { Order, OrderStatus, ORDER_STATUS_CONFIG } from '@/types';
import { Search, Filter, Eye, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const statusSteps: OrderStatus[] = ['menunggu_desain', 'proses_cetak', 'finishing', 'selesai', 'sudah_diambil'];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase()) && !o.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const updateStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status: newStatus });
    toast.success(`Status diperbarui ke "${ORDER_STATUS_CONFIG[newStatus].label}"`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari order atau pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48 bg-card">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(ORDER_STATUS_CONFIG).map(([key, conf]) => (
              <SelectItem key={key} value={key}>{conf.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {statusSteps.map(status => {
          const conf = ORDER_STATUS_CONFIG[status];
          const count = orders.filter(o => o.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
              className={`p-3 rounded-lg border text-center transition-all ${
                filterStatus === status ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <p className="text-xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{conf.label}</p>
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {filteredOrders.map(order => {
          const statusConf = ORDER_STATUS_CONFIG[order.status];
          return (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="stat-card cursor-pointer flex items-center gap-4 !p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-foreground">{order.orderNumber}</span>
                  <span className={`badge-status bg-${statusConf.color}/10 text-${statusConf.color}`}>{statusConf.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{order.customerName} • {order.customerPhone}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Deadline: {order.deadline} • {order.notes}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-foreground">{formatCurrency(order.total)}</p>
                <p className="text-xs text-muted-foreground">{order.estimatedMinutes} menit</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Tidak ada order ditemukan.</div>
        )}
      </div>

      {/* Order detail dialog */}
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
                  <p className="font-medium text-foreground">{selectedOrder.deadline}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimasi</p>
                  <p className="font-medium text-foreground">{selectedOrder.estimatedMinutes} menit</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{selectedOrder.notes || '-'}</p>
              </div>

              {/* Status progress */}
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Status Order</p>
                <div className="flex items-center gap-1">
                  {statusSteps.map((step, i) => {
                    const conf = ORDER_STATUS_CONFIG[step];
                    const currentIdx = statusSteps.indexOf(selectedOrder.status);
                    const isActive = i <= currentIdx;
                    return (
                      <div key={step} className="flex-1 flex flex-col items-center">
                        <button
                          onClick={() => updateStatus(selectedOrder.id, step)}
                          className={`w-full h-2 rounded-full transition-all ${isActive ? 'bg-primary' : 'bg-muted'}`}
                        />
                        <span className={`text-[10px] mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          {conf.label}
                        </span>
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
    </div>
  );
}
