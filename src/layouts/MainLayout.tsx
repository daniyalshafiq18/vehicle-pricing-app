import { Outlet, Link, useLocation } from 'react-router-dom';
import { ThemeSwitcher } from '@components/ui';
import { Car, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@utils';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Valuation', path: '/valuation' },
  { label: 'Admin', path: '/admin' },
];

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/valuation': 'Valuation',
  '/result': 'Valuation Result',
};

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Update browser tab title on route change
  useEffect(() => {
    const page = pageTitles[location.pathname] ?? '';
    document.title = page ? `${page} · Vehicle Pricing Intelligence Platform` : 'Vehicle Pricing Intelligence Platform';
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#d9e2e8] bg-white/70 backdrop-blur-md dark:border-[#31545a] dark:bg-[#071936]/80">
        <div className="mx-auto flex h-16 w-full max-w-[1536px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2 text-xl font-semibold no-underline hover:no-underline">
            <Car className="h-6 w-6 text-[#19b8a5] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
            <span className="text-sm font-semibold text-[#08766c] transition-colors duration-200 group-hover:text-[#19b8a5] dark:text-[#19b8a5] sm:text-base">
              Vehicle Pricing Intelligence Platform
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium no-underline transition-colors duration-200 hover:no-underline focus-visible:outline-none focus-visible:text-[#08766c] focus-visible:ring-2 focus-visible:ring-[#19b8a5]/25 dark:focus-visible:text-[#19b8a5]',
                  'after:absolute after:-bottom-[9px] after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-[#19b8a5] after:transition-all after:duration-300',
                  'hover:after:w-4/5',
                  location.pathname === link.path
                    ? 'text-[#08766c] visited:text-[#08766c] after:w-4/5 active:text-[#08766c] dark:text-[#19b8a5] dark:visited:text-[#19b8a5] dark:active:text-[#19b8a5]'
                    : 'text-muted-foreground visited:text-muted-foreground hover:text-[#08766c] active:text-[#08766c] dark:visited:text-muted-foreground dark:hover:text-[#19b8a5] dark:active:text-[#19b8a5]',
                )}
              >
                {link.label}
              </Link>
            ))}
            <ThemeSwitcher />
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t md:hidden"
            >
              <div className="mx-auto w-full max-w-[1536px] space-y-2 px-4 py-4 sm:px-6 lg:px-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      location.pathname === link.path
                        ? 'bg-[#ecfbf8] text-[#08766c] visited:text-[#08766c] active:text-[#08766c] dark:bg-[#0f3f43] dark:text-[#19b8a5] dark:visited:text-[#19b8a5] dark:active:text-[#19b8a5]'
                        : 'text-muted-foreground visited:text-muted-foreground hover:bg-[#ecfbf8] hover:text-[#08766c] active:bg-[#ecfbf8] active:text-[#08766c] dark:visited:text-muted-foreground dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5] dark:active:bg-[#0f3f43] dark:active:text-[#19b8a5]',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-2">
                  <ThemeSwitcher />
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 dark:border-slate-900 dark:bg-slate-900/50">
        <div className="mx-auto w-full max-w-[1536px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Brand column */}
            <div className="space-y-3">
              <div className="group flex items-center gap-2">
                <Car className="h-5 w-5 text-[#19b8a5] transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm font-semibold text-foreground">
                  Vehicle Pricing Intelligence
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Data-driven vehicle valuations powered by comprehensive UAE market analysis.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Quick Links
              </p>
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-sm text-muted-foreground transition-colors visited:text-muted-foreground hover:text-[#08766c] dark:visited:text-muted-foreground dark:hover:text-[#19b8a5]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal column */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Legal
              </p>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Datanox. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
