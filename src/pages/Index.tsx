import { Clock, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDailySales, useReportSummary, useTopProducts } from "@/hooks/useReports";
import { useOrders } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUS_CONFIG } from "@/types";

const pieColors = ["hsl(217, 91%, 60%)", "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

export default function Dashboard() {
  const { data: summary } = useReportSummary();
  const { data: dailySales = [] } = useDailySales();
  const { data: topProducts = [] } = useTopProducts();
  const { data: orders = [] } = useOrders();

  const stats = [
    {
      label: "Omset Periode",
      value: formatCurrency(summary?.totalRevenue ?? 0),
      icon: TrendingUp,
      color: "primary",
    },
    {
      label: "Order Pending",
      value: String(summary?.pendingOrders ?? 0),
      icon: Clock,
      color: "warning",
    },
    {
      label: "Total Transaksi",
      value: String(summary?.totalOrders ?? 0),
      icon: ShoppingCart,
      color: "info",
    },
    {
      label: "Pelanggan Aktif",
      value: String(summary?.totalCustomers ?? 0),
      icon: Users,
      color: "success",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}/10`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Penjualan Harian</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(215, 15%, 47%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(215, 15%, 47%)" }} tickFormatter={(value) => `${Math.round(value / 1000000)}jt`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Produk Terlaris</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {topProducts.map((_, index) => (
                  <Cell key={index} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {topProducts.slice(0, 4).map((product, index) => (
              <div key={product.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[index] }} />
                  <span className="text-muted-foreground truncate">{product.name}</span>
                </div>
                <span className="font-medium text-foreground">{product.sales}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Order Terbaru</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">No. Order</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Pelanggan</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Status</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Total</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => {
                const statusConfig = ORDER_STATUS_CONFIG[order.status];
                return (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{order.orderNumber}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{order.customerName}</td>
                    <td className="py-2.5 px-3">
                      <span className={`badge-status bg-${statusConfig.color}/10 text-${statusConfig.color}`}>{statusConfig.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-foreground">{formatCurrency(order.total)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {order.deadline ? new Date(order.deadline).toLocaleDateString("id-ID") : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
