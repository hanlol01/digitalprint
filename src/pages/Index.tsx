import { TrendingUp, ShoppingCart, Clock, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { salesData, topProducts, mockOrders, formatCurrency, mockCustomers } from '@/data/mockData';
import { ORDER_STATUS_CONFIG } from '@/types';

const stats = [
  { label: 'Omset Hari Ini', value: formatCurrency(3250000), change: '+12%', up: true, icon: TrendingUp, color: 'primary' },
  { label: 'Order Pending', value: '3', change: '+2', up: true, icon: Clock, color: 'warning' },
  { label: 'Total Transaksi', value: '18', change: '+5', up: true, icon: ShoppingCart, color: 'info' },
  { label: 'Pelanggan Aktif', value: '124', change: '+8', up: true, icon: Users, color: 'success' },
];

const pieColors = ['hsl(217, 91%, 60%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}/10`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
              </div>
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${stat.up ? 'text-success' : 'text-destructive'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Penjualan Mingguan</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(215, 15%, 47%)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(215, 15%, 47%)' }} tickFormatter={(v) => `${v / 1000000}jt`} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)} 
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(214, 32%, 91%)', fontSize: 13 }} 
              />
              <Bar dataKey="revenue" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="stat-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Produk Terlaris</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={2}>
                {topProducts.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '0.75rem', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {topProducts.slice(0, 4).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                  <span className="text-muted-foreground truncate">{p.name}</span>
                </div>
                <span className="font-medium text-foreground">{p.sales}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
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
              {mockOrders.map((order) => {
                const statusConf = ORDER_STATUS_CONFIG[order.status];
                return (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{order.orderNumber}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{order.customerName}</td>
                    <td className="py-2.5 px-3">
                      <span className={`badge-status bg-${statusConf.color}/10 text-${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-foreground">{formatCurrency(order.total)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{order.deadline}</td>
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
