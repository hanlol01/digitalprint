import { useMemo, useState } from "react";
import { Edit, Eye, EyeOff, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateEmployee, useDeleteEmployee, useEmployees, useUpdateEmployee } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel } from "@/lib/rbac";
import type { Employee, UserRole } from "@/types";

const roleOptions: UserRole[] = ["management", "admin", "staff", "operator"];

type EmployeeFormState = {
  fullName: string;
  username: string;
  password: string;
  phone: string;
  address: string;
  role: UserRole | "";
  isActive: boolean;
};

const defaultForm: EmployeeFormState = {
  fullName: "",
  username: "",
  password: "",
  phone: "",
  address: "",
  role: "",
  isActive: true,
};

const normalizePhone = (value: string): string => value.replace(/\D/g, "");

const formatDateTime = (value: string): string => {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Employees() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | UserRole>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(defaultForm);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { data: employees = [], isLoading } = useEmployees({ search, role: filterRole });
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const isSaving = createEmployee.isPending || updateEmployee.isPending;

  const canSubmit = useMemo(() => {
    if (form.fullName.trim().length < 2) return false;
    if (form.username.trim().length < 3) return false;
    if (!form.role) return false;
    if (!editingEmployee && form.password.trim().length < 6) return false;
    return true;
  }, [form.fullName, form.username, form.password, form.role, editingEmployee]);

  const openCreateDialog = () => {
    setEditingEmployee(null);
    setForm(defaultForm);
    setShowNewPassword(false);
    setDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setForm({
      fullName: employee.fullName ?? "",
      username: employee.username,
      password: "",
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      role: employee.role,
      isActive: employee.isActive,
    });
    setShowNewPassword(false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
    setForm(defaultForm);
    setShowNewPassword(false);
  };

  const validateForm = (): boolean => {
    if (form.fullName.trim().length < 2) {
      toast.error("Nama lengkap minimal 2 karakter");
      return false;
    }
    if (form.username.trim().length < 3) {
      toast.error("Username minimal 3 karakter");
      return false;
    }
    if (!form.role) {
      toast.error("Pilih role terlebih dahulu");
      return false;
    }
    if (!editingEmployee && form.password.trim().length < 6) {
      toast.error("Password minimal 6 karakter");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          fullName: form.fullName.trim(),
          username: form.username.trim().toLowerCase(),
          phone: normalizePhone(form.phone),
          address: form.address.trim(),
          role: form.role as UserRole,
          isActive: form.isActive,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        toast.success("Data karyawan berhasil diperbarui");
      } else {
        await createEmployee.mutateAsync({
          fullName: form.fullName.trim(),
          username: form.username.trim().toLowerCase(),
          password: form.password.trim(),
          phone: normalizePhone(form.phone),
          address: form.address.trim(),
          role: form.role as UserRole,
          isActive: form.isActive,
        });
        toast.success("Karyawan berhasil ditambahkan");
      }
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data karyawan");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee.mutateAsync(deleteTarget.id);
      toast.success(`Karyawan ${deleteTarget.username} berhasil dihapus`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus karyawan");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Karyawan</h3>
          <p className="text-sm text-muted-foreground">Kelola data akun dan identitas karyawan.</p>
        </div>
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="w-4 h-4" />
          Tambah Karyawan
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, username, atau no WA..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select value={filterRole} onValueChange={(value) => setFilterRole(value as "all" | UserRole)}>
          <SelectTrigger className="w-full sm:w-52 bg-card">
            <SelectValue placeholder="Filter role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Role</SelectItem>
            {roleOptions.map((role) => (
              <SelectItem key={role} value={role}>
                {getRoleLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>No WA</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Update Terakhir</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Memuat data karyawan...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Tidak ada data karyawan.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.fullName || "-"}</TableCell>
                  <TableCell>{employee.username}</TableCell>
                  <TableCell>{employee.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getRoleLabel(employee.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        employee.isActive
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-red-300 bg-red-50 text-red-700"
                      }
                    >
                      {employee.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(employee.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEditDialog(employee)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(employee)}
                        disabled={deleteEmployee.isPending || user?.id === employee.id}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Karyawan" : "Tambah Karyawan"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="employee-full-name">Nama Lengkap</Label>
              <Input
                id="employee-full-name"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employee-username">Username</Label>
              <Input
                id="employee-username"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Masukkan username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employee-phone">No Telepon / WhatsApp</Label>
              <Input
                id="employee-phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Contoh : 081234567890"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="employee-address">Alamat</Label>
              <Input
                id="employee-address"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Masukkan alamat karyawan"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employee-role">Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as UserRole }))}>
                <SelectTrigger id="employee-role">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employee-password">{editingEmployee ? "Password Baru (Opsional)" : "Password"}</Label>
              <div className="relative">
                <Input
                  id="employee-password"
                  type={showNewPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder={editingEmployee ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="employee-is-active">Akun Aktif</Label>
            <Switch
              id="employee-is-active"
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canSubmit || isSaving}>
              {isSaving ? "Menyimpan..." : editingEmployee ? "Simpan Perubahan" : "Tambah Karyawan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Karyawan</AlertDialogTitle>
            <AlertDialogDescription>
              Data karyawan <span className="font-semibold text-foreground">{deleteTarget?.username ?? "-"}</span> akan dihapus
              dari daftar aktif. Tindakan ini dapat dibatalkan dengan membuat ulang username yang sama.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleteEmployee.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployee.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
