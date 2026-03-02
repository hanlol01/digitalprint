import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, ClipboardList, Package, Users, 
  Warehouse, Calculator, FileText, Printer, Menu, LogOut, ChevronLeft, ChevronRight, Briefcase, PanelsTopLeft, Database, ChevronDown
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, getRoleLabel, normalizeRole } from '@/lib/rbac';
import { patchData } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const primaryNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'Kasir / POS' },
  { to: '/orders', icon: ClipboardList, label: 'Daftar Order' },
];

const masterDataItems = [
  { to: '/products', icon: Package, label: 'Produk' },
  { to: '/services', icon: Briefcase, label: 'Jasa' },
  { to: '/displays', icon: PanelsTopLeft, label: 'Display' },
  { to: '/customers', icon: Users, label: 'Pelanggan' },
  { to: '/materials', icon: Warehouse, label: 'Stok Bahan' },
  { to: '/master-data/categories', icon: Package, label: 'Kategori' },
  { to: '/master-data/units', icon: Calculator, label: 'Satuan' },
  { to: '/master-data/finishings', icon: Briefcase, label: 'Finishing' },
  { to: '/master-data/materials', icon: Warehouse, label: 'Material Jasa' },
  { to: '/master-data/frames', icon: PanelsTopLeft, label: 'Rangka' },
  { to: '/master-data/employees', icon: Users, label: 'Karyawan', allowedRoles: ['management'] },
];

const secondaryNavItems = [
  { to: '/calculator', icon: Calculator, label: 'Kalkulator Harga' },
  { to: '/reports', icon: FileText, label: 'Laporan Keuangan' },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'auto' | 'open' | 'closed'>('auto');
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();
  const isPathActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const navigate = useNavigate();
  const { user, logout, refreshMe } = useAuth();
  const userRole = user?.role ?? null;
  const normalizedRole = normalizeRole(userRole);
  const visiblePrimaryNavItems = primaryNavItems.filter((item) => canAccessRoute(userRole, item.to));
  const visibleMasterDataItems = masterDataItems.filter(
    (item) =>
      canAccessRoute(userRole, item.to) &&
      (!item.allowedRoles || (normalizedRole ? item.allowedRoles.includes(normalizedRole) : false)),
  );
  const visibleSecondaryNavItems = secondaryNavItems.filter((item) => canAccessRoute(userRole, item.to));
  const isInMasterData = visibleMasterDataItems.some((item) => isPathActive(item.to));
  const [masterDataOpen, setMasterDataOpen] = useState(isInMasterData);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: "", address: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const isSidebarExpanded = mobileOpen || sidebarMode === 'open' || (sidebarMode === 'auto' && isSidebarHovered);
  const navItems = [...visiblePrimaryNavItems, ...visibleMasterDataItems, ...visibleSecondaryNavItems];

  useEffect(() => {
    if (isInMasterData) setMasterDataOpen(true);
  }, [isInMasterData]);

  const displayName = user?.fullName?.trim() || user?.username || "-";
  const initials = displayName
    .slice(0, 2)
    .toUpperCase();

  const openProfileDialog = () => {
    setProfileForm({
      fullName: user?.fullName ?? "",
      address: user?.address ?? "",
      phone: user?.phone ?? "",
    });
    setProfileDialogOpen(true);
  };

  const openPasswordDialog = () => {
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordDialogOpen(true);
  };

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  const handleSaveProfile = async () => {
    const fullName = profileForm.fullName.trim();
    const address = profileForm.address.trim();
    const phone = normalizePhone(profileForm.phone);

    if (fullName.length < 2) {
      toast.error("Nama lengkap minimal 2 karakter");
      return;
    }

    try {
      setSavingProfile(true);
      await patchData("/auth/profile", { fullName, address, phone });
      await refreshMe();
      toast.success("Profil berhasil diperbarui");
      setProfileDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword.trim()) {
      toast.error("Password lama wajib diisi");
      return;
    }
    if (passwordForm.newPassword.trim().length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    try {
      setSavingPassword(true);
      await patchData("/auth/ganti-password", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password berhasil diganti");
      setPasswordDialogOpen(false);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengganti password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border
        transition-all duration-300 ease-in-out
        ${isSidebarExpanded ? 'w-64' : 'w-[72px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      onMouseEnter={() => {
        if (sidebarMode === 'auto') setIsSidebarHovered(true);
      }}
      onMouseLeave={() => {
        if (sidebarMode === 'auto') setIsSidebarHovered(false);
      }}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary overflow-hidden">
            {!logoError ? (
              <img
                src="/sidebar.png"
                alt="One Stop Service"
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Printer className="w-5 h-5 text-sidebar-primary-foreground" />
            )}
          </div>
          {isSidebarExpanded && (
            <div className="animate-fade-in">
              <h1 className="text-sm font-bold text-sidebar-foreground">One Stop Service</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Digital Printing</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visiblePrimaryNavItems.map((item) => {
            const isActive = isPathActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`sidebar-item ${
                  isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                } ${isSidebarExpanded ? '' : 'justify-center px-0'}`}
                title={isSidebarExpanded ? undefined : item.label}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {isSidebarExpanded && <span className="animate-fade-in">{item.label}</span>}
              </NavLink>
            );
          })}

          {visibleMasterDataItems.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!isSidebarExpanded) {
                    setSidebarMode('open');
                    setIsSidebarHovered(false);
                    setMasterDataOpen(true);
                    return;
                  }
                  setMasterDataOpen((prev) => !prev);
                }}
                className={`sidebar-item w-full ${
                  isInMasterData
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                } ${isSidebarExpanded ? '' : 'justify-center px-0'}`}
                title={isSidebarExpanded ? undefined : 'Master Data'}
              >
                <Database className="w-5 h-5 shrink-0" />
                {isSidebarExpanded ? (
                  <>
                    <span className="animate-fade-in flex-1 text-left">Master Data</span>
                    {masterDataOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </>
                ) : null}
              </button>

              {masterDataOpen && isSidebarExpanded && (
                <div className="space-y-1 pl-3">
                  {visibleMasterDataItems.map((item) => {
                    const isActive = isPathActive(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={`sidebar-item ${
                          isActive 
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' 
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {visibleSecondaryNavItems.map((item) => {
            const isActive = isPathActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`sidebar-item ${
                  isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                } ${isSidebarExpanded ? '' : 'justify-center px-0'}`}
                title={isSidebarExpanded ? undefined : item.label}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {isSidebarExpanded && <span className="animate-fade-in">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar control - desktop only */}
        <div className="hidden lg:flex items-center justify-center gap-1 p-2 border-t border-sidebar-border">
          <button
            type="button"
            onClick={() =>
              setSidebarMode((prev) => {
                setIsSidebarHovered(false);
                return prev === 'closed' ? 'auto' : 'closed';
              })
            }
            className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
              sidebarMode === 'closed'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
            title="Fix sidebar tertutup"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setSidebarMode((prev) => {
                setIsSidebarHovered(false);
                return prev === 'open' ? 'auto' : 'open';
              })
            }
            className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
              sidebarMode === 'open'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
            title="Fix sidebar terbuka"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center h-16 px-4 lg:px-6 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-2 lg:ml-0">
              <h2 className="text-lg font-semibold text-foreground">
                {navItems.find((item) => isPathActive(item.to))?.label || 'One Stop Service'}
              </h2>
            </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Online
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground leading-tight">{displayName}</p>
              <p className="text-[11px] text-muted-foreground uppercase">{getRoleLabel(user?.role)}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/15 transition-colors">
                  <span className="text-sm font-semibold text-primary">{initials}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground leading-tight">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground">{user?.username ?? "-"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openProfileDialog}>Profil Saya</DropdownMenuItem>
                <DropdownMenuItem onClick={openPasswordDialog}>Ganti Password</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>

        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Profil Saya</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-full-name">Nama Lengkap</Label>
                <Input
                  id="profile-full-name"
                  value={profileForm.fullName}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-address">Alamat</Label>
                <Input
                  id="profile-address"
                  value={profileForm.address}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Masukkan alamat"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">No Telepon / WhatsApp</Label>
                <Input
                  id="profile-phone"
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                  inputMode="numeric"
                  placeholder="Contoh: 081234567890"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Batal
              </Button>
              <Button type="button" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Menyimpan..." : "Simpan Profil"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ganti Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="old-password">Password Lama</Label>
                <Input
                  id="old-password"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Password Baru</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Batal
              </Button>
              <Button type="button" onClick={handleChangePassword} disabled={savingPassword}>
                {savingPassword ? "Menyimpan..." : "Perbarui Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
