'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@utils';
import { motion, AnimatePresence } from 'framer-motion';


export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  /** Placeholder shown when no value is selected */
  placeholder?: string;
  /** List of options */
  options: CustomSelectOption[];
  /** Currently selected value */
  value?: string;
  /** Called when an option is selected */
  onChange?: (value: string | undefined) => void;
  /** Disable the entire control */
  disabled?: boolean;
  /** Show search input at top of dropdown */
  searchable?: boolean;
  /** Additional class on the trigger */
  className?: string;
  /** Additional class on the dropdown panel */
  dropdownClassName?: string;
  /** Placement: 'bottom' or 'bottom-end' */
  placement?: 'bottom' | 'bottom-end';
}

/**
 * CustomSelect — A fully-styled dropdown that replaces native <select>.
 * Features: searchable options, click-outside-close, keyboard nav, dark mode.
 */
export function CustomSelect({
  placeholder = 'Select...',
  options,
  value,
  onChange,
  disabled = false,
  searchable = true,
  className,
  dropdownClassName,
  placement = 'bottom',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(
    () => {
      if (!searchable || !search) return options;
      const q = search.toLowerCase();
      return options.filter(
        (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
      );
    },
    [options, search, searchable],
  );

  // Reset search when opening
  useEffect(() => {
    if (open) {
      setSearch('');
      setFocusedIndex(-1);
      // Focus search input on next tick
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange?.(optValue === value ? undefined : optValue);
      setOpen(false);
    },
    [onChange, value],
  );

  // Keyboard navigation within dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[focusedIndex]!.value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, filteredOptions, focusedIndex, handleSelect],
  );

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLButtonElement>('[data-option-index]');
    const target = items[focusedIndex];
    target?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-sm shadow-sm transition-all',
          'border-input hover:border-primary/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-primary/50 ring-1 ring-primary/20',
          className,
        )}
      >
        <span className={cn('truncate', !selectedLabel && 'text-muted-foreground/60')}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.92, originY: 0 }}
            animate={{ opacity: 1, scaleY: 1, originY: 0 }}
            exit={{ opacity: 0, scaleY: 0.92, originY: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border bg-popover shadow-xl backdrop-blur-sm',
              placement === 'bottom-end' && 'right-0',
              dropdownClassName,
            )}
          >
            {/* Search */}
            {searchable && options.length > 8 && (
              <div className="relative border-b border-border p-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setFocusedIndex(-1); }}
                  placeholder="Search..."
                  className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Options */}
            <div
              ref={listRef}
              className="max-h-60 overflow-y-auto overscroll-contain p-1"
              role="listbox"
            >
              {filteredOptions.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/60">
                  No options found
                </div>
              ) : (
                filteredOptions.map((opt, i) => {
                  const isSelected = opt.value === value;
                  const isFocused = i === focusedIndex;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-option-index={i}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setFocusedIndex(i)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all',
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : isFocused
                            ? 'bg-accent/70 text-foreground'
                            : 'text-foreground/80 hover:bg-accent/50 hover:text-foreground',
                      )}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border transition-all">
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="h-2 w-2 rounded-sm bg-primary"
                          />
                        )}
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Selected count footer */}
            {value && (
              <div className="border-t border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => { onChange?.(undefined); setOpen(false); }}
                  className="flex w-full items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear selection
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
