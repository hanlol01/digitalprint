import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, DollarSign, Download, Plus, Receipt, TrendingDown, TrendingUp, Trash2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx-js-style";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateExpense, useDeleteExpense, useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { useDailySales, useExpenseByCategory, usePaymentMethodReport, useReportOrderTable, useReportSummary } from "@/hooks/useReports";
import { formatCurrency, formatNumber } from "@/lib/format";
import { canManageExpenses } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
  type Expense,
  type OrderStatus,
  type PaymentMethod,
  type TransactionItemType,
} from "@/types";
import { toast } from "sonner";

type Period = "harian" | "mingguan" | "bulanan" | "custom";

const EXPENSE_CATEGORIES = ["Bahan Baku", "Tinta", "Listrik", "Gaji Karyawan", "Sewa", "Transportasi", "Maintenance", "Lain-lain"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--accent))"];
const SHOW_ADVANCED_REPORT_CHARTS = false;

const parseCurrencyInput = (value: string): string => value.replace(/\D/g, "");
const transactionTypeOptions: Array<"all" | TransactionItemType> = ["all", "produk", "jasa", "display"];
const transactionTypeLabel: Record<"all" | TransactionItemType, string> = {
  all: "Semua Tipe",
  produk: "Produk",
  jasa: "Jasa",
  display: "Display",
};
const paymentMethodFilterOptions: Array<"all" | PaymentMethod> = ["all", "cash", "transfer", "qris", "piutang"];
const orderStatusFilterOptions: Array<"all" | OrderStatus> = [
  "all",
  "menunggu_desain",
  "proses_cetak",
  "finishing",
  "selesai",
  "sudah_diambil",
];

const formatCurrencyInput = (value: string): string => {
  if (!value) return "";
  return Number(value).toLocaleString("id-ID");
};

const formatShortDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  menunggu_desain: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  proses_cetak: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  finishing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  selesai: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  sudah_diambil: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
};

const PAYMENT_BADGE_STYLES: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  transfer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  qris: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  piutang: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const label = ORDER_STATUS_CONFIG[status]?.label ?? status;
  const style = STATUS_BADGE_STYLES[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", style)}>
      {label}
    </span>
  );
}

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const label = PAYMENT_METHOD_LABELS[method] ?? method;
  const style = PAYMENT_BADGE_STYLES[method] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", style)}>
      {label}
    </span>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const today = new Date();
  const defaultTableEndDate = today.toISOString().slice(0, 10);
  const defaultTableStartDate = new Date(new Date().setDate(today.getDate() - 30)).toISOString().slice(0, 10);
  const [period, setPeriod] = useState<Period>("bulanan");
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemType, setItemType] = useState<"all" | TransactionItemType>("all");
  const [tableStartDate, setTableStartDate] = useState(defaultTableStartDate);
  const [tableEndDate, setTableEndDate] = useState(defaultTableEndDate);
  const [tablePaymentMethod, setTablePaymentMethod] = useState<"all" | PaymentMethod>("all");
  const [tableStatus, setTableStatus] = useState<"all" | OrderStatus>("all");
  const [reportTablePage, setReportTablePage] = useState(1);
  const reportTableLimit = 10;

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({ date: "", category: "Bahan Baku", description: "", amount: "" });
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const canMutateExpense = canManageExpenses(user?.role);

  const range = useMemo(
    () => ({
      startDate: period === "custom" ? startDate : undefined,
      endDate: period === "custom" ? endDate : undefined,
      itemType,
    }),
    [period, startDate, endDate, itemType],
  );

  useEffect(() => {
    setReportTablePage(1);
  }, [itemType, tableStartDate, tableEndDate, tablePaymentMethod, tableStatus]);

  const { data: summary } = useReportSummary(range);
  const { data: dailySales = [] } = useDailySales(range);
  const { data: paymentMethodData = [] } = usePaymentMethodReport(range);
  const { data: expenseBreakdown = [] } = useExpenseByCategory(range);
  const { data: expenses = [] } = useExpenses(range);
  const { data: orderTableResult, isLoading: isOrderTableLoading } = useReportOrderTable({
    startDate: tableStartDate || undefined,
    endDate: tableEndDate || undefined,
    itemType,
    paymentMethod: tablePaymentMethod,
    status: tableStatus,
    page: reportTablePage,
    limit: reportTableLimit,
  });

  // Hook khusus untuk export: ambil SEMUA data transaksi sesuai filter (tanpa paginasi)
  const { data: exportOrderResult, isLoading: isExportLoading } = useReportOrderTable({
    startDate: tableStartDate || undefined,
    endDate: tableEndDate || undefined,
    itemType,
    paymentMethod: tablePaymentMethod,
    status: tableStatus,
    page: 1,
    limit: 10000,
  });
  const exportOrderData = exportOrderResult?.data ?? [];

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
  const orderTableData = orderTableResult?.data ?? [];
  const orderTableMeta = orderTableResult?.meta;
  const orderTableTotalPages = orderTableMeta?.totalPages ?? 1;
  const canGoPrevOrderTable = (orderTableMeta?.page ?? reportTablePage) > 1;
  const canGoNextOrderTable = (orderTableMeta?.page ?? reportTablePage) < orderTableTotalPages;

  const resetOrderTableFilters = () => {
    setTableStartDate(defaultTableStartDate);
    setTableEndDate(defaultTableEndDate);
    setTablePaymentMethod("all");
    setTableStatus("all");
    setReportTablePage(1);
  };

  const openAddExpense = () => {
    if (!canMutateExpense) {
      toast.error("Role Anda hanya dapat melihat laporan");
      return;
    }
    setEditingExpense(null);
    setExpenseForm({ date: new Date().toISOString().slice(0, 10), category: "Bahan Baku", description: "", amount: "" });
    setCategoryPickerOpen(false);
    setCategorySearch("");
    setExpenseDialogOpen(true);
  };

  const openEditExpense = (expense: Expense) => {
    if (!canMutateExpense) {
      toast.error("Role Anda hanya dapat melihat laporan");
      return;
    }
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
    if (!canMutateExpense) {
      toast.error("Role Anda hanya dapat melihat laporan");
      return;
    }
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
    if (!canMutateExpense) {
      toast.error("Role Anda hanya dapat melihat laporan");
      return;
    }
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

  const currentPage = orderTableMeta?.page ?? reportTablePage;

  // ===================== EXPORT TO EXCEL =====================
  const exportToExcel = () => {
    if (exportOrderData.length === 0 && expenses.length === 0) {
      toast.error("Tidak ada data untuk di-export");
      return;
    }

    const wb = XLSX.utils.book_new();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setCellStyle = (ws: any, r: number, c: number, style: any) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { v: "", t: "s" };
      ws[ref].s = style;
    };

    // ---- Definisi Style ----
    const border = {
      top: { style: "thin", color: { rgb: "333333" } },
      bottom: { style: "thin", color: { rgb: "333333" } },
      left: { style: "thin", color: { rgb: "333333" } },
      right: { style: "thin", color: { rgb: "333333" } },
    };

    const titleStyle = {
      font: { bold: true, sz: 14, color: { rgb: "1F2937" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const subtitleStyle = {
      font: { sz: 10, italic: true, color: { rgb: "4B5563" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const headerStyle = {
      font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "16A34A" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    };

    const cellLeft = {
      font: { sz: 10 },
      alignment: { vertical: "center", wrapText: true },
      border,
    };

    const cellCenter = {
      font: { sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    };

    const cellRight = {
      font: { sz: 10 },
      alignment: { horizontal: "right", vertical: "center" },
      border,
    };

    const cellBold = {
      font: { bold: true, sz: 10 },
      alignment: { vertical: "center", wrapText: true },
      border,
    };

    const totalLabelStyle = {
      font: { bold: true, sz: 11, color: { rgb: "1F2937" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill: { fgColor: { rgb: "D1FAE5" } },
      border,
    };

    const totalValueStyle = {
      font: { bold: true, sz: 11, color: { rgb: "1F2937" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill: { fgColor: { rgb: "D1FAE5" } },
      border,
    };

    const totalEmptyStyle = {
      font: { sz: 10 },
      fill: { fgColor: { rgb: "D1FAE5" } },
      border,
    };

    // ---- Label tanggal & filter ----
    const txDateLabel =
      tableStartDate && tableEndDate
        ? `Periode: ${formatShortDate(tableStartDate)} s/d ${formatShortDate(tableEndDate)}`
        : "Semua Periode";

    const filterParts: string[] = [];
    if (tablePaymentMethod !== "all") filterParts.push(`Cara Bayar: ${PAYMENT_METHOD_LABELS[tablePaymentMethod]}`);
    if (tableStatus !== "all") filterParts.push(`Status: ${ORDER_STATUS_CONFIG[tableStatus]?.label}`);
    const filterLabel = filterParts.length > 0 ? `Filter: ${filterParts.join("  |  ")}` : "";

    const periodLabels: Record<Period, string> = {
      harian: "Hari Ini",
      mingguan: "Minggu Ini",
      bulanan: "Bulan Ini",
      custom:
        startDate && endDate
          ? `${formatShortDate(startDate)} s/d ${formatShortDate(endDate)}`
          : "Custom",
    };
    const expDateLabel = `Periode: ${periodLabels[period]}`;

    // =============== SHEET 1: TRANSAKSI ===============
    const txCols = 10;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txAoa: any[][] = [];
    const txMerges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // Baris 0: Judul
    txAoa.push(["LAPORAN TRANSAKSI", ...Array(txCols - 1).fill("")]);
    txMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: txCols - 1 } });

    // Baris 1: Periode
    txAoa.push([txDateLabel, ...Array(txCols - 1).fill("")]);
    txMerges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: txCols - 1 } });

    // Baris 2: Filter (jika ada)
    if (filterLabel) {
      txAoa.push([filterLabel, ...Array(txCols - 1).fill("")]);
      txMerges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: txCols - 1 } });
    }

    // Baris kosong pemisah
    txAoa.push(Array(txCols).fill(""));

    // Baris header tabel
    const txHeaderRow = txAoa.length;
    txAoa.push(["No", "No Order", "Tanggal", "Nama Customer", "Item / Produk", "Qty", "Harga Satuan", "Total Order", "Metode Bayar", "Status"]);

    // Baris data
    const txDataStart = txAoa.length;
    let grandTotal = 0;

    exportOrderData.forEach((order, orderIndex) => {
      const items = order.items.length > 0 ? order.items : [null];
      const orderStartRow = txAoa.length;

      items.forEach((item, idx) => {
        txAoa.push([
          idx === 0 ? orderIndex + 1 : "",
          idx === 0 ? order.orderNumber : "",
          idx === 0 ? formatShortDate(order.orderDate) : "",
          idx === 0 ? order.customerName : "",
          item ? item.itemLabel : "-",
          item ? item.quantity : "",
          item ? formatCurrency(item.unitPrice) : "",
          idx === 0 ? formatCurrency(order.total) : "",
          idx === 0 ? (PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod) : "",
          idx === 0 ? (ORDER_STATUS_CONFIG[order.status]?.label ?? order.status) : "",
        ]);
      });

      // Merge cells untuk order dengan banyak item
      if (items.length > 1) {
        const endRow = orderStartRow + items.length - 1;
        [0, 1, 2, 3, 7, 8, 9].forEach((c) => {
          txMerges.push({ s: { r: orderStartRow, c }, e: { r: endRow, c } });
        });
      }

      grandTotal += order.total;
    });

    // Baris grand total
    const txTotalRow = txAoa.length;
    txAoa.push(["GRAND TOTAL", "", "", "", "", "", "", formatCurrency(grandTotal), "", ""]);
    txMerges.push({ s: { r: txTotalRow, c: 0 }, e: { r: txTotalRow, c: 6 } });
    txMerges.push({ s: { r: txTotalRow, c: 8 }, e: { r: txTotalRow, c: 9 } });

    // Buat worksheet transaksi
    const ws1 = XLSX.utils.aoa_to_sheet(txAoa);
    ws1["!merges"] = txMerges;
    ws1["!cols"] = [
      { wch: 6 },  // No
      { wch: 22 }, // No Order
      { wch: 12 }, // Tanggal
      { wch: 24 }, // Nama Customer
      { wch: 36 }, // Item / Produk
      { wch: 8 },  // Qty
      { wch: 18 }, // Harga Satuan
      { wch: 18 }, // Total Order
      { wch: 15 }, // Metode Bayar
      { wch: 18 }, // Status
    ];

    // Set row heights
    ws1["!rows"] = [];
    ws1["!rows"][0] = { hpt: 28 };
    ws1["!rows"][1] = { hpt: 18 };
    if (filterLabel) ws1["!rows"][2] = { hpt: 18 };
    ws1["!rows"][txHeaderRow] = { hpt: 24 };

    // Terapkan style: judul
    setCellStyle(ws1, 0, 0, titleStyle);
    // Terapkan style: subtitle (periode)
    setCellStyle(ws1, 1, 0, subtitleStyle);
    // Terapkan style: filter
    if (filterLabel) setCellStyle(ws1, 2, 0, subtitleStyle);

    // Terapkan style: header
    for (let c = 0; c < txCols; c++) {
      setCellStyle(ws1, txHeaderRow, c, headerStyle);
    }

    // Terapkan style: data rows
    for (let r = txDataStart; r < txTotalRow; r++) {
      for (let c = 0; c < txCols; c++) {
        let style = cellLeft;
        if (c === 0) style = cellCenter;       // No - center
        if (c === 1) style = cellBold;         // No Order - bold
        if (c === 2) style = cellCenter;       // Tanggal - center
        if (c === 5) style = cellCenter;       // Qty - center
        if (c === 6 || c === 7) style = cellRight; // Harga, Total - right
        if (c === 8) style = cellCenter;       // Metode - center
        if (c === 9) style = cellCenter;       // Status - center
        setCellStyle(ws1, r, c, style);
      }
    }

    // Terapkan style: total row
    for (let c = 0; c < txCols; c++) {
      if (c === 0) {
        setCellStyle(ws1, txTotalRow, c, totalLabelStyle);
      } else if (c === 7) {
        setCellStyle(ws1, txTotalRow, c, totalValueStyle);
      } else {
        setCellStyle(ws1, txTotalRow, c, totalEmptyStyle);
      }
    }

    XLSX.utils.book_append_sheet(wb, ws1, "Transaksi");

    // =============== SHEET 2: PENGELUARAN ===============
    const expCols = 4;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expAoa: any[][] = [];
    const expMerges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // Baris 0: Judul
    expAoa.push(["LAPORAN PENGELUARAN", ...Array(expCols - 1).fill("")]);
    expMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: expCols - 1 } });

    // Baris 1: Periode
    expAoa.push([expDateLabel, ...Array(expCols - 1).fill("")]);
    expMerges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: expCols - 1 } });

    // Baris kosong pemisah
    expAoa.push(Array(expCols).fill(""));

    // Baris header
    const expHeaderRow = expAoa.length;
    expAoa.push(["Tanggal", "Kategori", "Keterangan", "Jumlah (Rp)"]);

    // Baris data
    const expDataStart = expAoa.length;
    let expTotal = 0;
    expenses.forEach((exp) => {
      expAoa.push([
        new Date(exp.date).toLocaleDateString("id-ID"),
        exp.category,
        exp.description,
        formatCurrency(exp.amount),
      ]);
      expTotal += exp.amount;
    });

    // Baris total
    const expTotalRow = expAoa.length;
    expAoa.push(["TOTAL", "", "", formatCurrency(expTotal)]);
    expMerges.push({ s: { r: expTotalRow, c: 0 }, e: { r: expTotalRow, c: 2 } });

    // Buat worksheet pengeluaran
    const ws2 = XLSX.utils.aoa_to_sheet(expAoa);
    ws2["!merges"] = expMerges;
    ws2["!cols"] = [
      { wch: 18 },  // Tanggal
      { wch: 22 },  // Kategori
      { wch: 42 },  // Keterangan
      { wch: 22 },  // Jumlah
    ];

    ws2["!rows"] = [];
    ws2["!rows"][0] = { hpt: 28 };
    ws2["!rows"][1] = { hpt: 18 };
    ws2["!rows"][expHeaderRow] = { hpt: 24 };

    // Terapkan style: judul & subtitle
    setCellStyle(ws2, 0, 0, titleStyle);
    setCellStyle(ws2, 1, 0, subtitleStyle);

    // Terapkan style: header
    for (let c = 0; c < expCols; c++) {
      setCellStyle(ws2, expHeaderRow, c, headerStyle);
    }

    // Terapkan style: data rows
    for (let r = expDataStart; r < expTotalRow; r++) {
      for (let c = 0; c < expCols; c++) {
        let style = cellLeft;
        if (c === 0) style = cellCenter; // Tanggal - center
        if (c === 3) style = cellRight;  // Jumlah - right
        setCellStyle(ws2, r, c, style);
      }
    }

    // Terapkan style: total row
    for (let c = 0; c < expCols; c++) {
      if (c === 0) {
        setCellStyle(ws2, expTotalRow, c, totalLabelStyle);
      } else if (c === 3) {
        setCellStyle(ws2, expTotalRow, c, totalValueStyle);
      } else {
        setCellStyle(ws2, expTotalRow, c, totalEmptyStyle);
      }
    }

    XLSX.utils.book_append_sheet(wb, ws2, "Pengeluaran");

    // Simpan file
    const fileName = `Laporan_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("File Excel berhasil di-download!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!canMutateExpense ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Mode baca: hanya admin yang dapat menambah, mengubah, atau menghapus pengeluaran.
        </div>
      ) : null}

      {/* Top Filters */}
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
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Jenis Transaksi</Label>
          <Select value={itemType} onValueChange={(value) => setItemType(value as "all" | TransactionItemType)}>
            <SelectTrigger className="w-40 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {transactionTypeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {transactionTypeLabel[type]}
                </SelectItem>
              ))}
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

      {/* Summary Cards */}
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

      {/* Advanced Charts */}
      {SHOW_ADVANCED_REPORT_CHARTS ? (
        <>
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
        </>
      ) : null}

      {/* ===================== TOMBOL EXPORT TO EXCEL ===================== */}
      <div className="flex justify-end" data-testid="export-section">
        <Button
          data-testid="export-excel-btn"
          onClick={exportToExcel}
          disabled={isExportLoading}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
        >
          <Download className="w-4 h-4" />
          {isExportLoading ? "Memuat data..." : "Export to Excel"}
        </Button>
      </div>

      {/* ===================== TRANSACTION TABLE ===================== */}
      <div className="stat-card">
        {/* Header & Filters */}
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-base">Tabel Transaksi</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                Hal. {currentPage} / {orderTableTotalPages}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={resetOrderTableFilters} className="gap-1.5 text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
              <Input type="date" value={tableStartDate} onChange={(e) => setTableStartDate(e.target.value)} className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
              <Input type="date" value={tableEndDate} onChange={(e) => setTableEndDate(e.target.value)} className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cara Bayar</Label>
              <Select value={tablePaymentMethod} onValueChange={(value) => setTablePaymentMethod(value as "all" | PaymentMethod)}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodFilterOptions.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method === "all" ? "Semua Metode" : PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={tableStatus} onValueChange={(value) => setTableStatus(value as "all" | OrderStatus)}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orderStatusFilterOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "Semua Status" : ORDER_STATUS_CONFIG[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[160px]">No Order</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[90px]">Tanggal</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Nama</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ minWidth: 220 }}>Item</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[60px]">Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[110px]">Harga</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[110px]">Total</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Metode</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isOrderTableLoading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-sm">Memuat data transaksi...</span>
                    </div>
                  </td>
                </tr>
              ) : orderTableData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-muted-foreground">
                    Belum ada data transaksi pada periode ini
                  </td>
                </tr>
              ) : (
                orderTableData.map((order, orderIndex) => {
                  const rowSpan = Math.max(order.items.length, 1);
                  const isEven = orderIndex % 2 === 0;
                  const rowBg = isEven ? "bg-transparent" : "bg-muted/20";

                  if (order.items.length === 0) {
                    return (
                      <tr key={order.orderId} className={cn("border-b border-border/60", rowBg)}>
                        <td className="px-3 py-3 align-top font-medium text-foreground whitespace-nowrap">{order.orderNumber}</td>
                        <td className="px-3 py-3 align-top whitespace-nowrap text-muted-foreground tabular-nums">{formatShortDate(order.orderDate)}</td>
                        <td className="px-3 py-3 align-top text-foreground">{order.customerName}</td>
                        <td className="px-3 py-3 align-top text-muted-foreground italic">-</td>
                        <td className="px-3 py-3 align-top text-center text-muted-foreground">-</td>
                        <td className="px-3 py-3 align-top text-right text-muted-foreground">-</td>
                        <td className="px-3 py-3 align-top text-right font-semibold text-foreground tabular-nums">{formatCurrency(order.total)}</td>
                        <td className="px-3 py-3 align-top text-center"><PaymentBadge method={order.paymentMethod} /></td>
                        <td className="px-3 py-3 align-top text-center"><StatusBadge status={order.status} /></td>
                      </tr>
                    );
                  }

                  return order.items.map((item, itemIndex) => (
                    <tr
                      key={`${order.orderId}-${itemIndex}`}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        rowBg,
                        itemIndex === order.items.length - 1 && "border-b border-border/60",
                        itemIndex > 0 && "border-t border-border/20"
                      )}
                    >
                      {itemIndex === 0 ? (
                        <>
                          <td rowSpan={rowSpan} className="px-3 py-3 align-top font-medium text-foreground whitespace-nowrap border-b border-border/60">
                            {order.orderNumber}
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-3 align-top whitespace-nowrap text-muted-foreground tabular-nums border-b border-border/60">
                            {formatShortDate(order.orderDate)}
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-3 align-top text-foreground border-b border-border/60">
                            {order.customerName}
                          </td>
                        </>
                      ) : null}
                      <td className="px-3 py-2.5 text-foreground leading-snug">{item.itemLabel}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{formatNumber(item.quantity)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                      {itemIndex === 0 ? (
                        <>
                          <td rowSpan={rowSpan} className="px-3 py-3 align-top text-right font-semibold text-foreground tabular-nums border-b border-border/60">
                            {formatCurrency(order.total)}
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-3 align-top text-center border-b border-border/60">
                            <PaymentBadge method={order.paymentMethod} />
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-3 align-top text-center border-b border-border/60">
                            <StatusBadge status={order.status} />
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Menampilkan halaman <span className="font-medium text-foreground">{currentPage}</span> dari <span className="font-medium text-foreground">{orderTableTotalPages}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReportTablePage((prev) => Math.max(prev - 1, 1))}
              disabled={!canGoPrevOrderTable || isOrderTableLoading}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReportTablePage((prev) => prev + 1)}
              disabled={!canGoNextOrderTable || isOrderTableLoading}
              className="gap-1 text-xs"
            >
              Selanjutnya
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ===================== EXPENSE TABLE ===================== */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-base">Input Pengeluaran</h3>
          {canMutateExpense ? (
            <Button size="sm" onClick={openAddExpense} className="gap-1.5">
              <Plus className="w-4 h-4" /> Tambah
            </Button>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Tanggal</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Kategori</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keterangan</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Jumlah</th>
                {canMutateExpense ? (
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Aksi</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={canMutateExpense ? 5 : 4} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Belum ada data pengeluaran
                  </td>
                </tr>
              ) : (
                expenses.map((expense, idx) => (
                  <tr key={expense.id} className={cn("transition-colors hover:bg-muted/30", idx % 2 !== 0 && "bg-muted/20")}>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap tabular-nums">{new Date(expense.date).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-accent/50 text-accent-foreground">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{expense.description}</td>
                    <td className="px-4 py-3 text-right font-medium text-destructive tabular-nums">{formatCurrency(expense.amount)}</td>
                    {canMutateExpense ? (
                      <td className="px-4 py-3 text-right">
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
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== DIALOGS ===================== */}
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

