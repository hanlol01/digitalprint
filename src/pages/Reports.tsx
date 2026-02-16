import { useState, useMemo } from 'react';
import { mockOrders, salesData, formatCurrency, formatNumber } from '@/data/mockData';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Receipt, ArrowDownRight, ArrowUpRight, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Period = 'harian' | 'mingguan' | 'bulanan' | 'custom';

// Mock financial data
const monthlyReport = [
  { month: 'Sep', revenue: 18500000, expense: 8200000, profit: 10300000 },
  { month: 'Okt', revenue: 22100000, expense: 9800000, profit: 12300000 },
  { month: 'Nov', revenue: 19800000, expense: 8900000, profit: 10900000 },
  { month: 'Des', revenue: 28500000, expense: 12100000, profit: 16400000 },
  { month: 'Jan', revenue: 24200000, expense: 10500000, profit: 13700000 },
  { month: 'Feb', revenue: 9050000, expense: 4100000, profit: 4950000 },
];

const expenseBreakdown = [
  { name: 'Bahan Baku', value: 4500000, color: 'hsl(var(--primary))' },
  { name: 'Tinta', value: 1800000, color: 'hsl(var(--info))' },
  { name: 'Listrik', value: 950000, color: 'hsl(var(--warning))' },
  { name: 'Gaji Karyawan', value: 6000000, color: 'hsl(var(--success))' },
  { name: 'Sewa', value: 3500000, color: 'hsl(var(--accent))' },
  { name: 'Lain-lain', value: 800000, color: 'hsl(var(--muted-foreground))' },
];

const dailyTransactions = [
  { date: '10 Feb', income: 1250000, expense: 480000 },
  { date: '11 Feb', income: 980000, expense: 350000 },
  { date: '12 Feb', income: 1800000, expense: 620000 },
  { date: '13 Feb', income: 1450000, expense: 510000 },
  { date: '14 Feb', income: 2100000, expense: 780000 },
  { date: '15 Feb', income: 1650000, expense: 590000 },
  { date: '16 Feb', income: 820000, expense: 290000 },
];

const paymentMethodData = [
  { name: 'Cash', value: 4200000, color: 'hsl(var(--success))' },
  { name: 'Transfer', value: 3100000, color: 'hsl(var(--primary))' },
  { name: 'QRIS', value: 1450000, color: 'hsl(var(--info))' },
  { name: 'Piutang', value: 300000, color: 'hsl(var(--warning))' },
];

export default function Reports() {
  const [period, setPeriod] = useState<Period>('bulanan');
  const [startDate, setStartDate] = useState('2026-02-01');
  const [endDate, setEndDate] = useState('2026-02-16');

  const totalRevenue = monthlyReport.reduce((s, m) => s + m.revenue, 0);
  const totalExpense = monthlyReport.reduce((s, m) => s + m.expense, 0);
  const totalProfit = totalRevenue - totalExpense;
  const profitMargin = ((totalProfit / totalRevenue) * 100).toFixed(1);

  const currentMonth = monthlyReport[monthlyReport.length - 1];
  const prevMonth = monthlyReport[monthlyReport.length - 2];
  const revenueGrowth = ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue * 100).toFixed(1);

  const totalExpenseAmount = expenseBreakdown.reduce((s, e) => s + e.value, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Periode</Label>
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="harian">Harian</SelectItem>
              <SelectItem value="mingguan">Mingguan</SelectItem>
              <SelectItem value="bulanan">Bulanan</SelectItem>
              <SelectItem value="custom">Custom Tanggal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === 'custom' && (
          <div className="flex gap-2 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dari</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-card w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sampai</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-card w-40" />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Pendapatan</span>
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-success flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3" /> {revenueGrowth}% dari bulan lalu
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalExpense)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {((totalExpense / totalRevenue) * 100).toFixed(1)}% dari pendapatan
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Laba Bersih</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalProfit)}</p>
          <p className="text-xs text-primary flex items-center gap-1 mt-1">
            Margin: {profitMargin}%
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-info" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{formatNumber(mockOrders.length)}</p>
          <p className="text-xs text-muted-foreground mt-1">order tercatat</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue vs Expense Chart */}
        <div className="stat-card xl:col-span-2">
          <h3 className="font-semibold text-foreground text-sm mb-4">📊 Pendapatan vs Pengeluaran (6 Bulan)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyReport} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}jt`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Pendapatan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Pengeluaran" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Pie */}
        <div className="stat-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">💰 Rincian Pengeluaran</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={expenseBreakdown}
                cx="50%" cy="50%"
                outerRadius={70}
                innerRadius={40}
                dataKey="value"
                paddingAngle={2}
              >
                {expenseBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {expenseBreakdown.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-muted-foreground">{e.name}</span>
                </div>
                <span className="font-medium text-foreground">{((e.value / totalExpenseAmount) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Daily Line Chart */}
        <div className="stat-card xl:col-span-2">
          <h3 className="font-semibold text-foreground text-sm mb-4">📈 Arus Kas Harian (7 Hari Terakhir)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyTransactions}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}jt`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="income" name="Pemasukan" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Method Breakdown */}
        <div className="stat-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">💳 Metode Pembayaran</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={paymentMethodData}
                cx="50%" cy="50%"
                outerRadius={70}
                innerRadius={40}
                dataKey="value"
                paddingAngle={2}
              >
                {paymentMethodData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {paymentMethodData.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-muted-foreground">{p.name}</span>
                </div>
                <span className="font-medium text-foreground">{formatCurrency(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profit Trend */}
      <div className="stat-card">
        <h3 className="font-semibold text-foreground text-sm mb-4">🏆 Tren Laba Bersih (6 Bulan)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyReport}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}jt`} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <Bar dataKey="profit" name="Laba Bersih" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
