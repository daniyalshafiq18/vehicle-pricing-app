import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '@stores';
import { LoadingScreen, ThemeSwitcher } from '@components/ui';
import { cn } from '@utils';
import { useDataSource } from '@data';
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
import { useCallback, useState } from 'react';

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
function AdminLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar } = useAdminStore();
  const { data: inquiries } = useInquiries();
  const { data: missingRequests } = useMissingVehicleRequests();
  const { data: priceSuggestions } = usePriceSuggestions();
  const pendingCount = inquiries?.filter((i) => i.status === 'pending').length ?? 0;
  const pendingMissingCount = missingRequests?.filter((r) => r.status === 'Pending' || !r.status).length ?? 0;
  const pendingPriceSuggestionsCount = priceSuggestions?.filter((s) => s.statusValue === 4 || s.statusValue == null).length ?? 0;
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
                {(item.label === 'Queries' && pendingCount > 0) && (
                  <span className={cn(
                    'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white',
                    collapsed && 'hidden',
                  )}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
                {(item.label === 'Missing Vehicles' && pendingMissingCount > 0) && (
                  <span className={cn(
                    'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white',
                    collapsed && 'hidden',
                  )}>
                    {pendingMissingCount > 99 ? '99+' : pendingMissingCount}
                  </span>
                )}
                {(item.label === 'Price Suggestions' && pendingPriceSuggestionsCount > 0) && (
                  <span className={cn(
                    'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white',
                    collapsed && 'hidden',
                  )}>
                    {pendingPriceSuggestionsCount > 99 ? '99+' : pendingPriceSuggestionsCount}
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

/**
 * Admin layout with DataSource init guard.
 * Shows a loading screen until the Dataverse data source is ready,
 * preventing a crash when admin hooks call getDataSource() too early.
 */
export function AdminLayout() {
  const { isInitialized, isInitializing, error, triggerInit } = useDataSource();

  // Trigger deferred DataSource init when the admin panel is first visited.
  // This is a no-op if init has already started or completed.
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      triggerInit();
    }
  }, [isInitialized, isInitializing, triggerInit]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <LoadingScreen message="Loading admin panel..." />
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-lg font-medium text-destructive">Failed to load data source</p>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error || 'The admin panel could not connect to the database. Please try refreshing the page.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return <AdminLayoutContent />;
}
