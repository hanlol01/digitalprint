import { useState } from "react";
import { Mail, Phone, Search, ShoppingBag, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/useCustomers";
import { formatCurrency } from "@/lib/format";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useCustomers({ search });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cari pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Memuat data pelanggan...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {!isLoading &&
          customers.map((customer) => (
            <div key={customer.id} className="stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-primary">
                    {customer.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{customer.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {customer.phone}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" /> {customer.email || "-"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <ShoppingBag className="w-4 h-4 mx-auto text-primary mb-0.5" />
                  <p className="text-sm font-bold text-foreground">{customer.totalOrders}</p>
                  <p className="text-[10px] text-muted-foreground">Order</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(customer.totalSpent)}</p>
                  <p className="text-[10px] text-muted-foreground">Total Belanja</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <Star className="w-4 h-4 mx-auto text-warning mb-0.5" />
                  <p className="text-sm font-bold text-foreground">{customer.loyaltyPoints}</p>
                  <p className="text-[10px] text-muted-foreground">Poin</p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
