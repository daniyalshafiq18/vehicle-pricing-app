import { Outlet, Link, useLocation } from 'react-router-dom';
import { ThemeSwitcher } from '@components/ui';
import { Car, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@utils';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Valuation', path: '/valuation' },
  { label: 'Admin', path: '/admin' },
];

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-primary/50 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
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
                  'relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                  location.pathname === link.path
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/5',
                )}
              >
                {location.pathname === link.path && (
                  <span className="absolute inset-0 rounded-lg bg-primary/10 animate-scale-in" />
                )}
                <span className="relative z-10">{link.label}</span>
                {location.pathname === link.path && (
                  <span className="absolute -bottom-[13px] left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-primary" />
                )}
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
      <footer className="border-t bg-card/50">
        <div className="w-full max-w-[1536px] min-[2560px]:max-w-[90%] mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="group flex items-center gap-2 text-sm text-muted-foreground">
              <Car className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110" />
              <span>Vehicle Pricing Intelligence Platform</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Datanox. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
