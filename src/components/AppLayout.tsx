import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, ClipboardList, Package, Users, 
  Warehouse, Calculator, FileText, Printer, Menu, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'Kasir / POS' },
  { to: '/orders', icon: ClipboardList, label: 'Daftar Order' },
  { to: '/products', icon: Package, label: 'Produk' },
  { to: '/customers', icon: Users, label: 'Pelanggan' },
  { to: '/materials', icon: Warehouse, label: 'Stok Bahan' },
  { to: '/calculator', icon: Calculator, label: 'Kalkulator Harga' },
  { to: '/reports', icon: FileText, label: 'Laporan Keuangan' },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'auto' | 'open' | 'closed'>('auto');
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isSidebarExpanded = mobileOpen || sidebarMode === 'open' || (sidebarMode === 'auto' && isSidebarHovered);

  const initials = (user?.username ?? "US")
    .slice(0, 2)
    .toUpperCase();

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
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
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
              {navItems.find(i => i.to === location.pathname)?.label || 'One Stop Service'}
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Online
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground leading-tight">{user?.username ?? "-"}</p>
              <p className="text-[11px] text-muted-foreground uppercase">{user?.role ?? "-"}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">{initials}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
