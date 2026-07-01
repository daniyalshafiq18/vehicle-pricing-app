import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '@stores';
import { ThemeSwitcher } from '@components/ui';
import { cn } from '@utils';
import { useInquiries } from '@hooks';
import {
  LayoutDashboard,
  Car,
  Settings,
  ClipboardList,
  SearchX,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
} from 'lucide-react';
import { useCallback, useState } from 'react';

const sidebarItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Vehicles', path: '/admin/vehicles', icon: Car },
  { label: 'Queries', path: '/admin/queries', icon: ClipboardList },
  { label: 'Missing Vehicles', path: '/admin/missing-vehicles', icon: SearchX },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/vehicles': 'Vehicles',
  '/admin/queries': 'Queries',
  '/admin/missing-vehicles': 'Missing Vehicles',
  '/admin/settings': 'Settings',
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar } = useAdminStore();
  const { data: inquiries } = useInquiries();
  const pendingCount = inquiries?.filter((i) => i.status === 'pending').length ?? 0;
  const [hovered, setHovered] = useState(false);

  const collapsed = isSidebarCollapsed && !hovered;
  const actualWidth = collapsed ? 'w-16' : 'w-64';

  const currentPageTitle = pageTitles[location.pathname] ?? 'Admin';

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex flex-col border-r bg-card transition-all duration-300 shrink-0',
          actualWidth,
        )}
        onMouseEnter={() => isSidebarCollapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div className={cn(
            'min-w-0 transition-opacity duration-200',
            collapsed && 'hidden',
          )}>
            <p className="truncate text-sm font-bold text-foreground">Admin Center</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-hidden p-3">
          {sidebarItems.map((item) => {
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-transform duration-200',
                    !isActive && 'hover:scale-110',
                  )}
                />
                <span className={cn(
                  'text-foreground transition-opacity duration-200',
                  collapsed && 'hidden',
                )}>{item.label}</span>
                {item.label === 'Queries' && pendingCount > 0 && (
                  <span className={cn(
                    'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white',
                    collapsed && 'hidden',
                  )}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t p-3">
          <button
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-foreground"
            title={isSidebarCollapsed ? 'Back to site' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={cn(
              'transition-opacity duration-200',
              collapsed && 'hidden',
            )}>Back to site</span>
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Car className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">{currentPageTitle}</h1>
              <p className="text-xs text-muted-foreground/60">
                Vehicle Pricing Intelligence Platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-48 rounded-lg border bg-background/50 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:bg-background"
              />
            </div>
            <ThemeSwitcher />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
