import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, ClipboardList, Package, Users, 
  Warehouse, Calculator, FileText, Printer, ChevronLeft, Menu
} from 'lucide-react';
import { useState } from 'react';

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

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
        ${collapsed ? 'w-[72px]' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary">
            <Printer className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-sm font-bold text-sidebar-foreground">PrintPOS</h1>
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
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="animate-fade-in">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse button - desktop only */}
        <div className="hidden lg:flex p-3 border-t border-sidebar-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-item text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full justify-center"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
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
              {navItems.find(i => i.to === location.pathname)?.label || 'PrintPOS'}
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Online
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">KS</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
