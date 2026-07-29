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
  PanelLeftClose,
  PanelLeftOpen,
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
const badgeClass = (collapsed: boolean) => cn(
  'ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-900 px-1.5 text-[9px] font-semibold leading-none text-white',
  collapsed && 'hidden',
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
  const actualWidth = collapsed ? 'w-14' : 'w-56';

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
    <div className="flex h-screen overflow-hidden bg-[#e5e7eb] dark:bg-[#061821]">
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex shrink-0 flex-col border-r border-slate-100 bg-white text-slate-950 shadow-[1px_0_0_rgba(15,23,42,0.02)] transition-all duration-300',
          actualWidth,
        )}
        onMouseEnter={() => isSidebarCollapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Logo */}
        <div className={cn(
          'flex h-14 items-center gap-2.5 px-3',
          collapsed && 'justify-center px-0',
        )}>
          <div className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f8f7c] text-white shadow-sm transition-all duration-200',
            collapsed && 'hidden',
          )}>
            <Car className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <div className={cn(
            'min-w-0 transition-opacity duration-200',
            collapsed && 'hidden',
          )}>
            <p className="truncate text-[15px] font-bold leading-none tracking-normal text-slate-950">Admin Center</p>
          </div>
          <button
            onClick={toggleSidebar}
            className={cn(
              'ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-[#d9e2e8] bg-white text-[#6f8d99] shadow-[0_1px_3px_rgba(7,25,54,0.08)] transition-colors hover:border-[#b7cbd5] hover:bg-[#ecfbf8] hover:text-[#08766c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19b8a5]/30',
              'dark:border-[#31545a] dark:bg-[#0c2530] dark:text-[#8fb6cc] dark:hover:border-[#19b8a5]/50 dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]',
              collapsed && 'ml-0',
            )}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-3 w-3" strokeWidth={2} />
            ) : (
              <PanelLeftClose className="h-3 w-3" strokeWidth={2} />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-hidden px-2 pb-2 pt-2">
          <div className={cn(
            'mb-1 px-2 text-[9px] font-semibold uppercase leading-5 tracking-normal text-slate-400',
            collapsed && 'sr-only',
          )}>
            Main Menu
          </div>
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
                  'group relative mb-1 flex h-9 w-full items-center gap-2.5 rounded-[3px] px-2 text-left text-[11px] font-semibold leading-none transition-colors duration-150',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors duration-150',
                    isActive ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600',
                  )}
                  strokeWidth={1.8}
                />
                <span className={cn(
                  'truncate transition-opacity duration-200',
                  collapsed && 'hidden',
                )}>{item.label}</span>
                {(item.label === 'Queries' && pendingCount > 0) && (
                  <span className={badgeClass(collapsed)}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
                {(item.label === 'Missing Vehicles' && pendingMissingCount > 0) && (
                  <span className={badgeClass(collapsed)}>
                    {pendingMissingCount > 99 ? '99+' : pendingMissingCount}
                  </span>
                )}
                {(item.label === 'Price Suggestions' && pendingPriceSuggestionsCount > 0) && (
                  <span className={badgeClass(collapsed)}>
                    {pendingPriceSuggestionsCount > 99 ? '99+' : pendingPriceSuggestionsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-auto border-t border-slate-100 p-2">
          <button
            onClick={() => navigate('/')}
            className={cn(
              'flex h-9 w-full items-center gap-2.5 rounded-[3px] px-2 text-[11px] font-semibold leading-none text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-950',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Back to site' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.8} />
            <span className={cn(
              'truncate transition-opacity duration-200',
              collapsed && 'hidden',
            )}>Back to site</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#d9e2e8] bg-white px-6 dark:border-[#17383d] dark:bg-[#071936]">
          <div className="flex min-w-0 items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aabb5]" />
              <input
                type="text"
                placeholder="Search..."
                className="h-10 w-[260px] rounded-[10px] border border-[#d9e2e8] bg-white pl-10 pr-3 text-sm text-[#071936] outline-none transition-colors placeholder:text-[#b8c5cc] hover:border-[#b7cbd5] focus:border-[#19b8a5]/60 focus:bg-white focus:ring-2 focus:ring-[#19b8a5]/15 dark:border-[#31545a] dark:bg-[#0c2530] dark:text-white dark:placeholder:text-[#6f8d99] dark:hover:border-[#19b8a5]/50 dark:focus:bg-[#0c2530] sm:w-[360px] lg:w-[500px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Unified Notification Bell Dropdown */}
            <NotificationDropdown />
            <ThemeSwitcher />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-[#e5e7eb] p-6 lg:p-8 dark:bg-[#061821]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return <AdminLayoutContent />;
}
