import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@utils';

// ── Props ─────────────────────────────────────────────────────────────

export interface VehicleSelectProps {
  label?: string;
  icon?: React.ElementType;
  value: string | number;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
  /** Show search input inside the dropdown (default: true) */
  searchable?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function VehicleSelect({
  label,
  icon: Icon,
  value,
  placeholder,
  options,
  disabled = false,
  onChange,
  searchable = true,
}: VehicleSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuUp, setMenuUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // accept typed value on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      onChange(searchQuery.trim());
      setOpen(false);
    }
  };

  // auto-focus the search input when dropdown opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setSearchQuery('');
    }
  }, [open]);

  // smart flip: open upward if there isn't enough space below the button
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuUp(spaceBelow < 220);
    }
  }, [open]);

  const displayValue =
    options.find((o) => String(o.value) === String(value))?.label ?? String(value);
  const isSelected =
    value !== '' && value !== null && value !== undefined;

  // filter options by search query (case-insensitive)
  const filteredOptions = useMemo(
    () =>
      searchQuery
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : options,
    [options, searchQuery],
  );

  return (
    <div className="space-y-2" ref={ref}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={cn(
            'flex h-12 w-full items-center gap-2 rounded-xl border px-3 text-sm shadow-sm transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            disabled
              ? 'border-input/50 bg-muted/20 text-muted-foreground/50 cursor-not-allowed'
              : 'border-input bg-background hover:border-muted-foreground/30 cursor-pointer',
          )}
        >
          {Icon && (
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                disabled ? 'text-muted-foreground/30' : 'text-muted-foreground',
              )}
            />
          )}
          {isSelected ? (
            <span className="flex-1 text-left text-foreground">
              {displayValue}
            </span>
          ) : (
            <span className="flex-1 text-left text-muted-foreground/60">
              {placeholder}
            </span>
          )}

          {/* Clear button — visible only when a value is selected */}
          {isSelected && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-muted/60 hover:text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              disabled ? 'text-muted-foreground/20' : 'text-muted-foreground',
            )}
            style={{ transform: open && !disabled ? 'rotate(180deg)' : undefined }}
          />
        </button>

        {open && !disabled && (
          <div
            className={cn(
              'absolute left-0 z-50 min-w-max rounded-xl border border-border/50 bg-background shadow-xl shadow-black/5',
              menuUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            )}
          >
            {/* Search input */}
            {searchable && (
              <div className="relative border-b border-border/40">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Type to search..."
                  className="w-full border-0 bg-transparent py-3 pl-10 pr-9 text-sm outline-none placeholder:text-muted-foreground/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Options list */}
            <div className="max-h-52 overflow-y-auto">
              {/* "Clear Selection" row at top when a value is set and not searching */}
              {isSelected && !searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 border-b border-border/30 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/20">
                    <X className="h-3 w-3" />
                  </div>
                  <span className="flex-1">Clear Selection</span>
                </button>
              )}

              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const selected = String(opt.value) === String(value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        // Toggle off if already selected, otherwise select
                        if (selected) {
                          onChange('');
                        } else {
                          onChange(opt.value);
                        }
                        setOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                        selected
                          ? 'bg-primary/5 text-primary font-medium'
                          : 'text-foreground hover:bg-muted/50',
                      )}
                    >
                      <div
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          selected ? 'bg-primary' : 'bg-transparent',
                        )}
                      />
                      <span className="flex-1 truncate">{opt.label}</span>
                      {selected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })
              ) : searchQuery ? (
                <div className="border-b border-border/40 px-4 py-6 text-center text-sm text-muted-foreground/60">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground/60">
                  No options available
                </div>
              )}
              {/* Allow custom typed value when no exact match exists */}
              {searchable && searchQuery &&
                !options.some(
                  (o) => o.label.toLowerCase() === searchQuery.toLowerCase(),
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchQuery);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 border-t border-primary/10 bg-primary/[0.03] px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5">
                      <span className="text-[10px] font-bold text-primary">+</span>
                    </div>
                    <span>
                      Use "<span className="font-semibold">{searchQuery}</span>"
                    </span>
                  </button>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
