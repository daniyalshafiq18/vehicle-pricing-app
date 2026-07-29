import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInquiries, useMissingVehicleRequests, usePriceSuggestions } from '@hooks';
import { cn } from '@utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ClipboardList, SearchX, DollarSign, ArrowRight } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface NotificationSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  accentColor: string;       // Tailwind color for accent elements
  bgLight: string;            // Subtle background tint
  borderColor: string;        // Border tint
  hoverBg: string;            // Hover background
  textColor: string;          // Text + icon color
  count: number;
  preview: string;
}

interface NotificationDropdownProps {
  /** Optional override for the total pending count (auto-calculated by default) */
  pendingQueriesCount?: number;
  pendingMissingCount?: number;
  pendingPriceSuggestionsCount?: number;
}

// ─── Component ──────────────────────────────────────────────────────

export function NotificationDropdown(_props: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch data for badge counts
  const { data: inquiries } = useInquiries();
  const { data: missingRequests } = useMissingVehicleRequests();
  const { data: priceSuggestions } = usePriceSuggestions();

  const pendingQueriesCount = inquiries?.filter((i) => i.status === 'pending').length ?? 0;
  const pendingMissingCount = missingRequests?.filter((r) => r.status === 'Pending' || !r.status).length ?? 0;
  const pendingPriceSuggestionsCount = priceSuggestions?.filter((s) => s.statusValue === 4 || s.statusValue === undefined).length ?? 0;
  const totalPending = pendingQueriesCount + pendingMissingCount + pendingPriceSuggestionsCount;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setIsOpen(false); }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSectionClick = useCallback(
    (route: string) => {
      setIsOpen(false);
      navigate(route);
    },
    [navigate],
  );

  const sections: NotificationSection[] = [
    {
      key: 'queries',
      label: 'Queries',
      icon: <ClipboardList className="h-4 w-4" />,
      route: '/admin/queries',
      accentColor: 'bg-[#19b8a5]',
      bgLight: 'bg-[#ecfbf8] dark:bg-[#0f3f43]',
      borderColor: 'border-[#bfe9e2] dark:border-[#31545a]',
      hoverBg: 'hover:bg-[#ecfbf8] dark:hover:bg-[#0f3f43]',
      textColor: 'text-[#19b8a5]',
      count: pendingQueriesCount,
      preview: `${pendingQueriesCount} pending inquiry${pendingQueriesCount !== 1 ? 'ies' : 'y'} awaiting review`,
    },
    {
      key: 'missing-vehicles',
      label: 'Missing Vehicles',
      icon: <SearchX className="h-4 w-4" />,
      route: '/admin/missing-vehicles',
      accentColor: 'bg-[#19b8a5]',
      bgLight: 'bg-[#ecfbf8] dark:bg-[#0f3f43]',
      borderColor: 'border-[#bfe9e2] dark:border-[#31545a]',
      hoverBg: 'hover:bg-[#ecfbf8] dark:hover:bg-[#0f3f43]',
      textColor: 'text-[#19b8a5]',
      count: pendingMissingCount,
      preview: `${pendingMissingCount} vehicle request${pendingMissingCount !== 1 ? 's' : ''} pending`,
    },
    {
      key: 'price-suggestions',
      label: 'Price Suggestions',
      icon: <DollarSign className="h-4 w-4" />,
      route: '/admin/price-suggestions',
      accentColor: 'bg-[#19b8a5]',
      bgLight: 'bg-[#ecfbf8] dark:bg-[#0f3f43]',
      borderColor: 'border-[#bfe9e2] dark:border-[#31545a]',
      hoverBg: 'hover:bg-[#ecfbf8] dark:hover:bg-[#0f3f43]',
      textColor: 'text-[#19b8a5]',
      count: pendingPriceSuggestionsCount,
      preview: `${pendingPriceSuggestionsCount} suggestion${pendingPriceSuggestionsCount !== 1 ? 's' : ''} pending approval`,
    },
  ];

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19b8a5]/30 focus-visible:ring-offset-2',
          totalPending > 0 || isOpen
            ? 'border border-[#d9e2e8] bg-white text-[#08766c] shadow-sm hover:border-[#19b8a5]/40 hover:bg-[#ecfbf8] dark:border-[#31545a] dark:bg-[#0c2530] dark:text-[#19b8a5] dark:hover:bg-[#0f3f43]'
            : 'border border-transparent text-[#071936] hover:bg-[#ecfbf8] hover:text-[#08766c] dark:text-white dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]',
        )}
        aria-label={totalPending > 0 ? `Toggle notifications, ${totalPending} pending` : 'Toggle notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-[18px] w-[18px]" />

        {/* Numeric pending count */}
        {totalPending > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-[#19b8a5] px-1 text-[10px] font-medium leading-none text-white shadow-sm dark:border-[#071936]">
            {totalPending > 99 ? '99+' : totalPending}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden',
              'rounded-[14px] border border-[#d9e2e8] bg-white shadow-[0_18px_36px_rgba(7,25,54,0.16)] dark:border-[#31545a] dark:bg-[#0c2530] dark:shadow-[0_18px_36px_rgba(0,0,0,0.35)]',
            )}
          >
            {/* Dropdown header */}
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3 dark:border-[#31545a]">
              <span className="text-sm font-semibold text-[#071936] dark:text-white">Notifications</span>
              {totalPending > 0 && (
                <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-medium text-[#8aa0ad] dark:bg-[#17383d] dark:text-[#8fb6cc]">
                  {totalPending} pending
                </span>
              )}
            </div>

            {/* Section list */}
            <div className="py-1.5">
              {sections.map((section) => (
                <button
                  key={section.key}
                  onClick={() => handleSectionClick(section.route)}
                  className={cn(
                    'group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-all duration-150',
                    section.hoverBg,
                  )}
                >
                  {/* Accent left bar */}
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-150',
                      section.accentColor,
                      'group-hover:opacity-100',
                    )}
                  />

                  {/* Icon container */}
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150',
                      section.borderColor,
                      section.bgLight,
                      section.textColor,
                    )}
                  >
                    {section.icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#071936] dark:text-white">{section.label}</span>
                      {section.count > 0 && (
                        <span
                          className={cn(
                            'flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#19b8a5] px-1.5 text-[10px] font-medium text-white',
                          )}
                        >
                          {section.count > 99 ? '99+' : section.count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#9aabb5] line-clamp-1 dark:text-[#8fb6cc]">
                      {totalPending > 0 ? section.preview : 'No pending items'}
                    </p>
                  </div>

                  {/* Arrow indicator */}
                  <ArrowRight
                    className={cn(
                      'mt-1 h-3.5 w-3.5 shrink-0 text-[#b8c5cc] transition-all duration-150',
                      '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Dropdown footer - quick link */}
            <div className="border-t border-[#e5e7eb] px-4 py-2.5 dark:border-[#31545a]">
              <button
                onClick={() => handleSectionClick('/admin')}
                className="flex w-full items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-medium text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]"
              >
                <Bell className="h-3.5 w-3.5" />
                View all notifications in Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
