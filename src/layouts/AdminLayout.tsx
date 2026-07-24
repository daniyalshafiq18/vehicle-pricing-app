import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '@stores';
import { ThemeSwitcher, NotificationDropdown } from '@components/ui';
import { cn } from '@utils';
import { useInquiries, useMissingVehicleRequests, usePriceSuggestions } from '@hooks';
import {
  LayoutDashboard,
  Car,
  Settings,
  ClipboardList,
  SearchX,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const sidebarItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Vehicles', path: '/admin/vehicles', icon: Car },
  { label: 'Queries', path: '/admin/queries', icon: ClipboardList },
  { label: 'Missing Vehicles', path: '/admin/missing-vehicles', icon: SearchX },
  { label: 'Price Suggestions', path: '/admin/price-suggestions', icon: DollarSign },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/vehicles': 'Vehicles',
  '/admin/queries': 'Queries',
  '/admin/missing-vehicles': 'Missing Vehicles',
  '/admin/price-suggestions': 'Price Suggestions',
  '/admin/settings': 'Settings',
};

/**
 * Inner component that renders the full admin layout.
 * Only mounted once DataSource is initialized (hooks are safe).
 */

/** Shared notification badge style. */
const badgeClass = (collapsed: boolean, isActive: boolean = false) => cn(
  'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
  collapsed && 'hidden',
  isActive
    ? 'bg-white text-accent-foreground'
    : 'bg-accent text-accent-foreground',
);

function AdminLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar } = useAdminStore();
  const { data: inquiries } = useInquiries();
  const { data: missingRequests } = useMissingVehicleRequests();
  const { data: priceSuggestions } = usePriceSuggestions();
  const pendingCount = inquiries?.filter((i) => i.status === 'pending').length ?? 0;
  const pendingMissingCount = missingRequests?.filter((r) => r.status === 'Pending' || !r.status).length ?? 0;
  const pendingPriceSuggestionsCount = priceSuggestions?.filter((s) => s.statusValue === 4 || s.statusValue === undefined).length ?? 0;
  const [hovered, setHovered] = useState(false);

  const collapsed = isSidebarCollapsed && !hovered;
  const actualWidth = collapsed ? 'w-16' : 'w-64';

  const currentPageTitle = pageTitles[location.pathname] ?? 'Admin';

  // Update browser tab title on route change
  useEffect(() => {
    document.title = `${currentPageTitle} · Admin · Vehicle Pricing Intelligence Platform`;
  }, [currentPageTitle]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  return (
    <div className="brand-canvas flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl shadow-primary/10 transition-all duration-300',
          actualWidth,
        )}
        onMouseEnter={() => isSidebarCollapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="brand-icon h-9 w-9 rounded-lg">
            <Car className="relative z-10 h-5 w-5" />
          </div>
          <div className={cn(
            'min-w-0 transition-opacity duration-200',
            collapsed && 'hidden',
          )}>
            <p className="truncate text-sm font-bold text-sidebar-foreground">Admin Center</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-sidebar-muted">Intelligence</p>
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
                    ? 'brand-gradient text-white shadow-md shadow-primary/20'
                    : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-transform duration-200',
                    !isActive && 'hover:scale-110',
                  )}
                />
                <span className={cn(
                  'transition-opacity duration-200',
                  collapsed && 'hidden',
                  isActive && 'text-white',
                )}>{item.label}</span>
                {(item.label === 'Queries' && pendingCount > 0) && (
                  <span className={badgeClass(collapsed, isActive)}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
                {(item.label === 'Missing Vehicles' && pendingMissingCount > 0) && (
                  <span className={badgeClass(collapsed, isActive)}>
                    {pendingMissingCount > 99 ? '99+' : pendingMissingCount}
                  </span>
                )}
                {(item.label === 'Price Suggestions' && pendingPriceSuggestionsCount > 0) && (
                  <span className={badgeClass(collapsed, isActive)}>
                    {pendingPriceSuggestionsCount > 99 ? '99+' : pendingPriceSuggestionsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t px-3 pt-3 pb-10">
          <button
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
          className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-primary/30 bg-background text-primary shadow-sm transition-colors hover:border-accent hover:text-accent"
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
        <header className="relative flex h-16 shrink-0 items-center justify-between border-b bg-card/85 px-6 backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-primary/50 after:via-accent/60 after:to-transparent">
          <div className="flex items-center gap-3">
            <div className="brand-icon h-8 w-8 rounded-lg">
              <Car className="relative z-10 h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">{currentPageTitle}</h1>
              <p className="text-sm text-muted-foreground/60">
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
            {/* Unified Notification Bell Dropdown */}
            <NotificationDropdown />
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

export function AdminLayout() {
  return <AdminLayoutContent />;
}
