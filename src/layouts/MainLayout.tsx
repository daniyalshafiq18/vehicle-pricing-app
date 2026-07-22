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
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/70 backdrop-blur-md dark:border-slate-900 dark:bg-slate-950/70 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-primary/50 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
        <div className="w-full max-w-[1536px] min-[2560px]:max-w-[90%] mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="group flex items-center gap-2 text-xl font-bold">
            <Car className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
            <span className="gradient-text text-sm sm:text-base">Vehicle Pricing Intelligence Platform</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium transition-colors duration-200',
                  'after:absolute after:-bottom-[9px] after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-all after:duration-300',
                  'hover:after:w-4/5',
                  location.pathname === link.path
                    ? 'text-primary after:w-4/5'
                    : 'text-muted-foreground hover:text-foreground',
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
              <div className="w-full max-w-[1536px] min-[2560px]:max-w-[90%] mx-auto space-y-2 px-4 py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      location.pathname === link.path
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent',
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
        <div className="w-full max-w-[1536px] min-[2560px]:max-w-[90%] mx-auto px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Brand column */}
            <div className="space-y-3">
              <div className="group flex items-center gap-2">
                <Car className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
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
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Links
              </p>
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-sm text-muted-foreground transition-colors hover:text-violet-600 dark:hover:text-violet-400"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal column */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
