import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, DollarSign, Plus, Receipt, TrendingDown, TrendingUp, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateExpense, useDeleteExpense, useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { useDailySales, useExpenseByCategory, usePaymentMethodReport, useReportSummary } from "@/hooks/useReports";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types";
import { toast } from "sonner";

type Period = "harian" | "mingguan" | "bulanan" | "custom";

const EXPENSE_CATEGORIES = ["Bahan Baku", "Tinta", "Listrik", "Gaji Karyawan", "Sewa", "Transportasi", "Maintenance", "Lain-lain"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--accent))"];

const parseCurrencyInput = (value: string): string => value.replace(/\D/g, "");

const formatCurrencyInput = (value: string): string => {
  if (!value) return "";
  return Number(value).toLocaleString("id-ID");
};

export default function Reports() {
  const [period, setPeriod] = useState<Period>("bulanan");
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({ date: "", category: "Bahan Baku", description: "", amount: "" });
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const range = useMemo(() => (period === "custom" ? { startDate, endDate } : undefined), [period, startDate, endDate]);

  const { data: summary } = useReportSummary(range);
  const { data: dailySales = [] } = useDailySales(range);
  const { data: paymentMethodData = [] } = usePaymentMethodReport(range);
  const { data: expenseBreakdown = [] } = useExpenseByCategory(range);
  const { data: expenses = [] } = useExpenses(range);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const categoryOptions = useMemo(() => {
    const defaultCategorySet = new Set(EXPENSE_CATEGORIES.map((category) => category.trim().toLowerCase()));
    const seen = new Set(EXPENSE_CATEGORIES.map((category) => category.trim().toLowerCase()));
    const merged = [...EXPENSE_CATEGORIES];

    expenses.forEach((expense) => {
      const category = expense.category.trim();
      const key = category.toLowerCase();
      if (!category || seen.has(key) || defaultCategorySet.has(key)) return;
      seen.add(key);
      merged.push(category);
    });

    return merged;
  }, [expenses]);

  const normalizedCategorySearch = categorySearch.trim().toLowerCase();

  const filteredCategoryOptions = useMemo(() => {
    if (!normalizedCategorySearch) return categoryOptions;
    return categoryOptions.filter((category) => category.toLowerCase().includes(normalizedCategorySearch));
  }, [categoryOptions, normalizedCategorySearch]);

  const showCreateCategoryOption = normalizedCategorySearch.length > 0 && filteredCategoryOptions.length === 0;

  const revenueData = dailySales.map((item) => ({ date: item.date, income: item.revenue }));
  const expenseData = dailySales.map((item, index) => ({
    date: item.date,
    income: item.revenue,
    expense: Math.round(((summary?.totalExpense ?? 0) / Math.max(dailySales.length, 1)) * (0.8 + ((index % 3) * 0.1))),
  }));

  const profitMargin = summary && summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : "0.0";

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({ date: new Date().toISOString().slice(0, 10), category: "Bahan Baku", description: "", amount: "" });
    setCategoryPickerOpen(false);
    setCategorySearch("");
    setExpenseDialogOpen(true);
  };

  const openEditExpense = (expense: Expense) => {
    const normalizedExpenseCategory = expense.category.trim();
    const categoryExists = categoryOptions.some((category) => category.toLowerCase() === normalizedExpenseCategory.toLowerCase());
    setEditingExpense(expense);
    setExpenseForm({
      date: expense.date.slice(0, 10),
      category: categoryExists ? normalizedExpenseCategory : categoryOptions[0] ?? "Bahan Baku",
      description: expense.description,
      amount: String(expense.amount),
    });
    setCategoryPickerOpen(false);
    setCategorySearch("");
    setExpenseDialogOpen(true);
  };

  const saveExpense = async () => {
    const amount = Number(parseCurrencyInput(expenseForm.amount));
    const category = expenseForm.category.trim();

    if (!expenseForm.date || !category || !expenseForm.description.trim() || !amount || amount <= 0) {
      toast.error("Isi semua field dengan benar");
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({
          id: editingExpense.id,
          date: expenseForm.date,
          category,
          description: expenseForm.description,
          amount,
        });
        toast.success("Pengeluaran diperbarui");
      } else {
        await createExpense.mutateAsync({
          date: expenseForm.date,
          category,
          description: expenseForm.description,
          amount,
        });
        toast.success("Pengeluaran ditambahkan");
      }
      setExpenseDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan pengeluaran");
    }
  };

  const confirmDelete = async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpense.mutateAsync(deletingExpense.id);
      toast.success("Pengeluaran dihapus");
      setDeleteDialogOpen(false);
      setDeletingExpense(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus pengeluaran");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Periode</Label>
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="w-40 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="harian">Harian</SelectItem>
              <SelectItem value="mingguan">Mingguan</SelectItem>
              <SelectItem value="bulanan">Bulanan</SelectItem>
              <SelectItem value="custom">Custom Tanggal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" && (
          <div className="flex gap-2 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dari</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-card w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sampai</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-card w-40" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Pendapatan</span>
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(summary?.totalRevenue ?? 0)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(summary?.totalExpense ?? 0)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Laba Bersih</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(summary?.totalProfit ?? 0)}</p>
          <p className="text-xs text-primary mt-1">Margin: {profitMargin}%</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-info" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{formatNumber(summary?.totalOrders ?? 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="stat-card xl:col-span-2">
          <h3 className="font-semibold text-foreground text-sm mb-4">Pendapatan Harian</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="income" name="Pendapatan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="stat-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">Rincian Pengeluaran</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={2}>
                {expenseBreakdown.map((entry, index) => (
                  <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {expenseBreakdown.map((item, index) => (
              <div key={item.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-muted-foreground">{item.category}</span>
                </div>
                <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="stat-card xl:col-span-2">
          <h3 className="font-semibold text-foreground text-sm mb-4">Arus Kas Harian</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={expenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="income" name="Pemasukan" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="stat-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">Metode Pembayaran</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={2}>
                {paymentMethodData.map((entry, index) => (
                  <Cell key={entry.method} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {paymentMethodData.map((item, index) => (
              <div key={item.method} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-muted-foreground">{item.method}</span>
                </div>
                <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm">Input Pengeluaran</h3>
          <Button size="sm" onClick={openAddExpense} className="gap-1.5">
            <Plus className="w-4 h-4" /> Tambah
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-xs text-muted-foreground font-medium">Tanggal</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium">Kategori</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium">Keterangan</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium text-right">Jumlah</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 text-foreground">{new Date(expense.date).toLocaleDateString("id-ID")}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-accent/50 text-accent-foreground">{expense.category}</span>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{expense.description}</td>
                  <td className="py-2.5 text-right font-medium text-destructive">{formatCurrency(expense.amount)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEditExpense(expense)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingExpense(expense);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Belum ada data pengeluaran</p>}
        </div>
      </div>

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</DialogTitle>
            <DialogDescription>Isi detail pengeluaran di bawah ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal</Label>
                <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori</Label>
                <Popover
                  open={categoryPickerOpen}
                  onOpenChange={(open) => {
                    setCategoryPickerOpen(open);
                    if (!open) setCategorySearch("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {expenseForm.category || "Pilih kategori..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Cari kategori..."
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList>
                        {filteredCategoryOptions.map((category) => (
                          <CommandItem
                            key={category}
                            value={category}
                            onSelect={() => {
                              setExpenseForm((prev) => ({ ...prev, category }));
                              setCategoryPickerOpen(false);
                              setCategorySearch("");
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", expenseForm.category === category ? "opacity-100" : "opacity-0")} />
                            {category}
                          </CommandItem>
                        ))}
                        {showCreateCategoryOption && (
                          <CommandItem
                            value={`add-${normalizedCategorySearch}`}
                            onSelect={() => {
                              const newCategory = categorySearch.trim();
                              setExpenseForm((prev) => ({ ...prev, category: newCategory }));
                              setCategoryPickerOpen(false);
                              setCategorySearch("");
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Kategori "{categorySearch.trim()}"
                          </CommandItem>
                        )}
                        {!showCreateCategoryOption && filteredCategoryOptions.length === 0 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">Kategori tidak ditemukan.</p>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Keterangan</Label>
              <Textarea
                placeholder="Deskripsi pengeluaran..."
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                maxLength={200}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Jumlah (Rp)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatCurrencyInput(expenseForm.amount)}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: parseCurrencyInput(e.target.value) }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveExpense} disabled={createExpense.isPending || updateExpense.isPending}>
              {editingExpense ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pengeluaran</DialogTitle>
            <DialogDescription>Yakin ingin menghapus pengeluaran "{deletingExpense?.description}"?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteExpense.isPending}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
