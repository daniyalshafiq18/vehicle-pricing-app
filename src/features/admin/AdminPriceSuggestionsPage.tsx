import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePriceSuggestions, useUpdatePriceSuggestion, useUpdatePriceSuggestionStatus, usePriceSuggestionStatusOptions } from '@hooks';
import { Button, Dialog, SkeletonTable, Card as UICard, CardContent } from '@components/ui';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  ExternalLink,
  Check,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Edit,
  Clock,
  LayoutList,
  LayoutGrid,
  User,
} from 'lucide-react';
import type { PriceSuggestion } from '@types';
import type { PicklistOption } from '@lib/optionSetApi';
import { cn, formatCurrency } from '@utils';

// ─── Status visuals (keyed by Dataverse optionset value) ────────

/**
 * Visual configuration per status value. The values are stable Dataverse
 * optionset integers so they don't change when labels are edited in the
 * Dataverse admin UI.
 */
const STATUS_VISUALS: Record<number, { icon: React.ReactNode; className: string; dot: string }> = {
  4: {
    icon: <Clock className="h-3 w-3" />,
    className: 'text-[#08766c] bg-[#ecfbf8] border-[#bfe9e2]',
    dot: 'bg-[#19b8a5]',
  },
  1: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'text-[#08766c] bg-[#ecfbf8] border-[#bfe9e2]',
    dot: 'bg-[#19b8a5]',
  },
  2: {
    icon: <XCircle className="h-3 w-3" />,
    className: 'text-[#08766c] bg-[#ecfbf8] border-[#bfe9e2]',
    dot: 'bg-[#19b8a5]',
  },
  3: {
    icon: <Edit className="h-3 w-3" />,
    className: 'text-[#08766c] bg-[#ecfbf8] border-[#bfe9e2]',
    dot: 'bg-[#19b8a5]',
  },
};

function StatusBadge({ suggestion }: { suggestion: PriceSuggestion }) {
  const visual = suggestion.statusValue != null ? STATUS_VISUALS[suggestion.statusValue] : null;
  if (!visual) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/30 border-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        {suggestion.status || 'Unknown'}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', visual.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', visual.dot)} />
      {suggestion.status}
    </span>
  );
}

function StatusSelect({ suggestion, options }: { suggestion: PriceSuggestion; options: PicklistOption[] }) {
  const updateStatus = useUpdatePriceSuggestionStatus();
  const [open, setOpen] = useState(false);
  const isPending = updateStatus.isPending;

  const currentVisual = suggestion.statusValue != null
    ? STATUS_VISUALS[suggestion.statusValue]
    : null;

  const handleSelect = useCallback(
    (opt: PicklistOption) => {
      setOpen(false);
      updateStatus.mutate({ id: suggestion.id, statusValue: opt.value });
    },
    [suggestion.id, updateStatus],
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
          'hover:bg-[#dff7f4] focus:outline-none focus:ring-2 focus:ring-[#19b8a5]/30',
          'disabled:opacity-50',
          currentVisual?.className ?? 'text-muted-foreground bg-muted/30 border-muted',
        )}
      >
        {currentVisual?.icon ?? <Clock className="h-3 w-3" />}
        {suggestion.status || 'Pending'}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-[10px] border border-[#d9e2e8] bg-white shadow-[0_12px_28px_rgba(7,25,54,0.14)]">
            {options.map((opt) => {
              const visual = STATUS_VISUALS[opt.value];
              const isActive = suggestion.statusValue === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-[#ecfbf8] text-[#08766c]'
                      : 'text-[#647887] hover:bg-[#dff7f4] hover:text-[#08766c]',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', visual?.dot ?? 'bg-muted-foreground/40')} />
                  {opt.label}
                  {isActive && <Check className="ml-auto h-3 w-3 text-[#19b8a5]" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Format helpers ──────────────────────────────────────────────

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const mins = Math.floor(diff / (1000 * 60));
      return `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Detail Modal ────────────────────────────────────────────────

function PriceSuggestionDetailModal({
  suggestion,
  isOpen,
  onClose,
  statusOptions,
}: {
  suggestion: PriceSuggestion;
  isOpen: boolean;
  onClose: () => void;
  statusOptions: PicklistOption[];
}) {
  const [editMinPrice, setEditMinPrice] = useState(suggestion.minPrice ?? 0);
  const [editMaxPrice, setEditMaxPrice] = useState(suggestion.maxPrice ?? 0);
  const updateMutation = useUpdatePriceSuggestion();
  const updateStatusMutation = useUpdatePriceSuggestionStatus();

  // Reset fields when suggestion changes
  useEffect(() => {
    setEditMinPrice(suggestion.minPrice ?? 0);
    setEditMaxPrice(suggestion.maxPrice ?? 0);
  }, [suggestion]);

  const handleSave = () => {
    const minChanged = editMinPrice !== (suggestion.minPrice ?? 0);
    const maxChanged = editMaxPrice !== (suggestion.maxPrice ?? 0);
    const pricesChanged = minChanged || maxChanged;

    updateMutation.mutate(
      { id: suggestion.id, minPrice: editMinPrice || 0, maxPrice: editMaxPrice || 0 },
      {
        onSuccess: () => {
          // Only auto-set status to "Edit & Approve" (value 3) when prices actually changed
          if (pricesChanged) {
            updateStatusMutation.mutate({ id: suggestion.id, statusValue: 3 });
          }
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description=""
      size="lg"
      hideCloseButton
    >
      <div className="flex max-h-[85vh] flex-col gap-0">
        {/* Header */}
        <div className="shrink-0 -mx-6 -mt-6 rounded-t-2xl bg-gradient-to-br from-[#ecfbf8] via-[#f4fbfa] to-transparent px-6 pb-4 pt-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ecfbf8] shadow-sm">
                <DollarSign className="h-6 w-6 text-[#19b8a5]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Price Suggestion
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Submitted {suggestion.createdOn ? formatDate(suggestion.createdOn) : 'Unknown date'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusSelect suggestion={suggestion} options={statusOptions} />
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Vehicle info */}
          {suggestion.vehicleName && (
            <div className="mb-4 rounded-xl border bg-gradient-to-r from-blue-500/5 to-transparent p-3.5">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Vehicle</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                <DollarSign className="h-4 w-4 text-blue-500" />
                {suggestion.vehicleName}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Submitted By (read-only) */}
            <div className="rounded-xl border bg-card p-3.5">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Submitted By</p>
              <p className="mt-1 text-sm font-medium text-foreground break-words">{suggestion.submittedBy || '—'}</p>
            </div>

            {/* Status (read-only) */}
            <div className="rounded-xl border bg-card p-3.5">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Status</p>
              <p className="mt-1 text-sm font-medium text-foreground">{suggestion.status || 'Pending'}</p>
            </div>

            {/* Min Price (editable) */}
            <div className="rounded-xl border bg-card p-3.5">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Min Price</p>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground/50">AED</span>
                <input
                  type="number"
                  value={editMinPrice}
                  onChange={(e) => setEditMinPrice(Number(e.target.value))}
                  className="h-9 w-full rounded-[10px] border border-[#d9e2e8] bg-white pl-10 pr-3 text-sm font-medium text-[#071936] outline-none transition-colors focus:border-[#19b8a5]/60 focus:ring-2 focus:ring-[#19b8a5]/15"
                />
              </div>
              {editMinPrice > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Formatted: <span className="font-medium text-foreground/80">{formatCurrency(editMinPrice)}</span>
                </p>
              )}
            </div>

            {/* Max Price (editable) */}
            <div className="rounded-xl border bg-card p-3.5">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Max Price</p>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground/50">AED</span>
                <input
                  type="number"
                  value={editMaxPrice}
                  onChange={(e) => setEditMaxPrice(Number(e.target.value))}
                  className="h-9 w-full rounded-[10px] border border-[#d9e2e8] bg-white pl-10 pr-3 text-sm font-medium text-[#071936] outline-none transition-colors focus:border-[#19b8a5]/60 focus:ring-2 focus:ring-[#19b8a5]/15"
                />
              </div>
              {editMaxPrice > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Formatted: <span className="font-medium text-foreground/80">{formatCurrency(editMaxPrice)}</span>
                </p>
              )}
            </div>

            {/* Source URL (read-only) */}
            <div className="rounded-xl border bg-card p-3.5 col-span-2">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Source URL</p>
              {suggestion.sourceUrl ? (
                <a
                  href={suggestion.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#08766c] break-words hover:underline"
                >
                  {suggestion.sourceUrl}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <p className="mt-1 text-sm font-medium text-foreground break-words">—</p>
              )}
            </div>
          </div>

          {/* Comment (read-only) */}
          {suggestion.comment && (
            <div className="mt-3 rounded-xl border bg-card p-3.5">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Comment</p>
              <p className="mt-1 text-sm font-medium text-foreground">{suggestion.comment}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 -mx-6 -mb-6 border-t bg-muted/20 px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Price Suggestion Card (Card View) ─────────────────────────────

function PriceSuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: PriceSuggestion;
  onClick: () => void;
}) {
  const statusLabel = suggestion.status || 'Pending';
  const visual = suggestion.statusValue != null ? STATUS_VISUALS[suggestion.statusValue] : null;

  const statusClassName = visual?.className ?? 'text-muted-foreground bg-muted/30 border-muted';
  const statusDot = visual?.dot ?? 'bg-muted-foreground/40';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group h-full"
    >
      <UICard className="overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 h-full">
        <CardContent className="p-5 flex flex-col h-full">
          {/* Header: vehicle name + status */}
          <div className="flex items-start justify-between mb-4 shrink-0 gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-foreground leading-tight truncate">
                {suggestion.vehicleName || suggestion.vehicleId || 'Unknown Vehicle'}
              </h3>
              {suggestion.submittedBy && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{suggestion.submittedBy}</span>
                </p>
              )}
            </div>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium shrink-0', statusClassName)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusDot)} />
              {statusLabel}
            </span>
          </div>

          {/* Price details */}
          <div className="flex items-stretch gap-3">
            <div className="flex-1 rounded-xl border bg-gradient-to-br from-emerald-500/10 to-transparent p-3.5">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Min Price</p>
              <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {suggestion.minPrice ? formatCurrency(suggestion.minPrice) : '—'}
              </p>
            </div>
            <div className="flex-1 rounded-xl border bg-gradient-to-br from-blue-500/10 to-transparent p-3.5">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Max Price</p>
              <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                {suggestion.maxPrice ? formatCurrency(suggestion.maxPrice) : '—'}
              </p>
            </div>
          </div>

          {/* Source URL */}
          {suggestion.sourceUrl && (
            <div className="mt-3 rounded-xl bg-muted/40 p-3 shrink-0">
              <p className="text-[10px] text-slate-800 dark:text-slate-200">Source</p>
              <p className="mt-0.5 truncate text-xs text-[#08766c]">{suggestion.sourceUrl}</p>
            </div>
          )}

          {/* Comment preview */}
          {suggestion.comment && (
            <div className="mt-2 shrink-0">
              <p className="text-xs text-muted-foreground line-clamp-2 italic">
                &ldquo;{suggestion.comment}&rdquo;
              </p>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer: date + action */}
          <div className="mt-3 flex items-center justify-between border-t pt-3 shrink-0">
            <div>
              <p className="text-[10px] font-medium text-slate-800 dark:text-slate-200">Submitted</p>
              <p className="text-xs text-foreground">
                {suggestion.createdOn
                  ? new Date(suggestion.createdOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" title="View details" onClick={onClick}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </UICard>
    </motion.div>
  );
}

// ─── Card View Skeleton ────────────────────────────────────────────

function PriceSuggestionCardSkeleton() {
  return (
    <div className="h-[340px] animate-pulse rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-4 w-28 rounded bg-muted" />
        </div>
        <div className="h-6 w-20 rounded-full bg-muted" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 h-[88px] rounded-xl bg-muted/50" />
        <div className="flex-1 h-[88px] rounded-xl bg-muted/50" />
      </div>
      <div className="mt-3 h-[60px] rounded-xl bg-muted/50" />
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-8 w-8 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Animations ──────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

// ─── Main Page ───────────────────────────────────────────────────

export function AdminPriceSuggestionsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [search, setSearch] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<PriceSuggestion | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilterValue, setStatusFilterValue] = useState<number | 'all'>('all');
  const pageSize = 15;

  const { data: suggestions, isLoading: suggestionsLoading, error: fetchError } = usePriceSuggestions();
  const { data: statusOptions = [], isLoading: statusOptionsLoading } = usePriceSuggestionStatusOptions();

  // Wait for ALL data to load before showing content
  const isLoading = suggestionsLoading || statusOptionsLoading;

  // Build filter tabs dynamically from fetched Dataverse options
  const filterTabs = useMemo(() => {
    const all = suggestions?.length ?? 0;
    return [
      { value: 'all' as const, label: 'All', count: all, color: '' },
      ...statusOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        count: suggestions?.filter((s) => s.statusValue === opt.value).length ?? 0,
        color: STATUS_VISUALS[opt.value]?.dot ?? 'bg-muted-foreground/40',
      })),
    ];
  }, [statusOptions, suggestions]);

  // Filter by search and status
  const filtered = (suggestions ?? []).filter((s) => {
    if (statusFilterValue !== 'all' && s.statusValue !== statusFilterValue) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.submittedBy ?? '').toLowerCase().includes(q) ||
      (s.vehicleName ?? '').toLowerCase().includes(q) ||
      (s.comment ?? '').toLowerCase().includes(q) ||
      String(s.minPrice ?? '').includes(q) ||
      String(s.maxPrice ?? '').includes(q)
    );
  });

  // Sort by newest first
  const sorted = [...filtered].sort(
    (a, b) => {
      const aDate = a.createdOn ? new Date(a.createdOn).getTime() : 0;
      const bDate = b.createdOn ? new Date(b.createdOn).getTime() : 0;
      return bDate - aDate;
    },
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const getPageNumbers = useCallback(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      if (start > 2) pages.push('ellipsis');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, page]);

  return (
    <motion.div
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Price Suggestions</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{suggestions?.length ?? 0}</span> total suggestions
              {(() => {
                const pendingTab = filterTabs.find((t) => t.value === 4);
                if (pendingTab && pendingTab.count > 0) {
                  return (
                    <>
                      <span className="mx-1.5 text-muted-foreground/30">·</span>
                      <span className="font-medium text-[#08766c] dark:text-[#19b8a5]">
                        {pendingTab.count} pending
                      </span>
                    </>
                  );
                }
                return null;
              })()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border bg-card p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                  viewMode === 'table'
                    ? 'bg-[#ecfbf8] text-[#08766c] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title="Table view"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                  viewMode === 'card'
                    ? 'bg-[#ecfbf8] text-[#08766c] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title="Card view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Card</span>
              </button>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search suggestions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-48 rounded-[10px] border border-[#d9e2e8] bg-white pl-9 pr-3 text-sm text-[#071936] outline-none transition-colors placeholder:text-[#b8c5cc] hover:border-[#b7cbd5] focus:border-[#19b8a5]/60 focus:ring-2 focus:ring-[#19b8a5]/15 md:w-72"
              />
            </div>
            {search && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); }}>
                <RotateCcw className="mr-1.5 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Status filter tabs — built dynamically from Dataverse options */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-[12px] border-0 bg-white p-1.5 shadow-[0_8px_20px_rgba(18,38,63,0.05)]">
          {filterTabs.map((tab) => (
            <button
              key={String(tab.value)}
              onClick={() => { setStatusFilterValue(tab.value); setPage(1); }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap',
                statusFilterValue === tab.value
                  ? 'bg-[#ecfbf8] text-[#08766c] shadow-sm'
                  : 'text-[#647887] hover:bg-[#dff7f4] hover:text-[#08766c]',
              )}
            >
              {tab.color && <span className={cn('h-1.5 w-1.5 rounded-full', tab.color)} />}
              {tab.label}
              <span className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                statusFilterValue === tab.value
                  ? 'bg-[#dff7f4] text-[#08766c]'
                  : 'bg-[#f4f8fb] text-[#8aa0ad]',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <motion.div
          key="table-view"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="rounded-2xl border bg-card overflow-hidden">
            {isLoading ? (
              <div className="p-6">
                <SkeletonTable rows={8} cols={5} />
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
                <p className="text-lg font-medium text-foreground">Failed to load suggestions</p>
                <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                  {fetchError.message || 'An unexpected error occurred. Check the console for details.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" />
                  Refresh page
                </Button>
              </div>
            ) : paginated.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="w-10 px-4 py-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-200">#</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-200">Vehicle</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-200">Submitted By</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-200">Min Price</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-200">Max Price</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-200">Status</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-200">Submitted</th>
                      <th className="px-4 py-3.5 text-right text-sm font-semibold text-slate-800 dark:text-slate-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginated.map((s, i) => (
                      <tr
                        key={s.id}
                        className="group/row transition-colors hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelectedSuggestion(s)}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap max-w-[200px]">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                              <DollarSign className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="truncate text-sm font-medium text-foreground" title={s.vehicleName || s.vehicleId}>
                              {s.vehicleName || s.vehicleId || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-foreground">{s.submittedBy || '—'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-foreground">
                            {s.minPrice ? formatCurrency(s.minPrice) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-foreground">
                            {s.maxPrice ? formatCurrency(s.maxPrice) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge suggestion={s} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground">
                              {s.createdOn ? formatShortDate(s.createdOn) : '—'}
                            </span>
                            {s.createdOn && (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(s.createdOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="View details"
                              onClick={(e) => { e.stopPropagation(); setSelectedSuggestion(s); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50">
                  <DollarSign className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  {search || statusFilterValue !== 'all' ? 'No matching suggestions' : 'No price suggestions yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                  {search
                    ? 'Try adjusting your search.'
                    : statusFilterValue !== 'all'
                      ? `No suggestions with "${
                          statusOptions.find((o) => o.value === statusFilterValue)?.label ?? statusFilterValue
                        }" status.`
                      : 'When users suggest pricing corrections, they will appear here.'}
                </p>
                {(search || statusFilterValue !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSearch(''); setStatusFilterValue('all'); }}
                    className="mt-4"
                  >
                    <RotateCcw className="mr-1.5 h-3 w-3" />
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Card View ── */}
      {viewMode === 'card' && (
        <motion.div
          key="card-view"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PriceSuggestionCardSkeleton key={i} />
              ))}
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border bg-card">
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
                <p className="text-lg font-medium text-foreground">Failed to load suggestions</p>
                <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                  {fetchError.message || 'An unexpected error occurred. Check the console for details.'}
                </p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4">
                  <RotateCcw className="mr-1.5 h-3 w-3" />
                  Refresh page
                </Button>
              </div>
            </div>
          ) : paginated.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((s) => (
                <PriceSuggestionCard
                  key={s.id}
                  suggestion={s}
                  onClick={() => setSelectedSuggestion(s)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card">
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50">
                  <DollarSign className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  {search || statusFilterValue !== 'all' ? 'No matching suggestions' : 'No price suggestions yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                  {search
                    ? 'Try adjusting your search.'
                    : statusFilterValue !== 'all'
                      ? `No suggestions with "${
                          statusOptions.find((o) => o.value === statusFilterValue)?.label ?? statusFilterValue
                        }" status.`
                      : 'When users suggest pricing corrections, they will appear here.'}
                </p>
                {(search || statusFilterValue !== 'all') && (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilterValue('all'); }} className="mt-4">
                    <RotateCcw className="mr-1.5 h-3 w-3" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Pagination */}
      {sorted.length > pageSize && (
        <motion.div variants={itemVariants}>
          <div className="flex flex-col items-center justify-between gap-3 rounded-[12px] bg-white/70 px-3 py-2 shadow-[0_8px_20px_rgba(18,38,63,0.04)] dark:bg-[#0c2530]/80 sm:flex-row">
            <p className="text-sm font-medium text-[#647887] dark:text-[#8fb6cc]">
              Page <span className="text-foreground">{page}</span> of <span className="text-foreground">{totalPages}</span>
              <span className="mx-2 text-muted-foreground/30">·</span>
              <span>{sorted.length} total</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-9 min-w-9 rounded-[10px] !bg-white !px-2 !text-[#647887] shadow-[0_6px_14px_rgba(18,38,63,0.05)] hover:!bg-[#dff7f4] hover:!text-[#08766c] disabled:!bg-transparent disabled:!text-[#9aabb5] disabled:shadow-none dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]" disabled={page <= 1} onClick={() => setPage(1)} title="First page">
                <ChevronLeft className="h-3.5 w-3.5" />
                <ChevronLeft className="-ml-2 h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 min-w-9 rounded-[10px] !bg-white !px-2 !text-[#647887] shadow-[0_6px_14px_rgba(18,38,63,0.05)] hover:!bg-[#dff7f4] hover:!text-[#08766c] disabled:!bg-transparent disabled:!text-[#9aabb5] disabled:shadow-none dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) =>
                  pageNum === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={pageNum}
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        'h-9 min-w-9 rounded-[10px] px-3 text-xs font-bold shadow-[0_6px_14px_rgba(18,38,63,0.05)]',
                        page === pageNum
                          ? '!bg-[#19b8a5] !text-white shadow-[0_8px_18px_rgba(25,184,165,0.28)]'
                          : '!bg-white !text-[#071936] hover:!bg-[#dff7f4] hover:!text-[#08766c] dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]',
                      )}
                    >
                      {pageNum}
                    </Button>
                  )
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-9 min-w-9 rounded-[10px] !bg-white !px-2 !text-[#647887] shadow-[0_6px_14px_rgba(18,38,63,0.05)] hover:!bg-[#dff7f4] hover:!text-[#08766c] disabled:!bg-transparent disabled:!text-[#9aabb5] disabled:shadow-none dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 min-w-9 rounded-[10px] !bg-white !px-2 !text-[#647887] shadow-[0_6px_14px_rgba(18,38,63,0.05)] hover:!bg-[#dff7f4] hover:!text-[#08766c] disabled:!bg-transparent disabled:!text-[#9aabb5] disabled:shadow-none dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]" disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last page">
                <ChevronRight className="h-3.5 w-3.5" />
                <ChevronRight className="-ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Detail modal */}
      {selectedSuggestion && (
        <PriceSuggestionDetailModal
          suggestion={selectedSuggestion}
          isOpen={!!selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
          statusOptions={statusOptions}
        />
      )}
    </motion.div>
  );
}
