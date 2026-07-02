import { useState, useCallback } from 'react';
import { useMissingVehicleRequests, useUpdateMissingVehicleRequestStatus } from '@hooks';
import { Button, Dialog, SkeletonTable } from '@components/ui';
import { motion } from 'framer-motion';
import {
  Car,
  SearchX,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { MissingVehicleRequest } from '@types';
import { cn } from '@utils';

// ─── Status helpers ────────────────────────────────────────────

const STATUS_OPTIONS = ['Pending', 'Approved', 'In Progress', 'Reject'] as const;

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string; dot: string }> = {
  Pending: {
    label: 'Pending',
    icon: <Clock className="h-3 w-3" />,
    className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  Approved: {
    label: 'Approved',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  'In Progress': {
    label: 'In Progress',
    icon: <AlertCircle className="h-3 w-3" />,
    className: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  Reject: {
    label: 'Reject',
    icon: <XCircle className="h-3 w-3" />,
    className: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
    dot: 'bg-red-500',
  },
};

function StatusBadge({ status }: { status: string | undefined }) {
  const cfg = STATUS_CONFIG[status ?? ''];
  if (!cfg) {
    const fallback = STATUS_CONFIG['Pending']!;
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', fallback.className)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', fallback.dot)} />
        {status || 'Pending'}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', cfg.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function StatusSelect({ request }: { request: MissingVehicleRequest }) {
  const updateStatus = useUpdateMissingVehicleRequestStatus();
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (newStatus: string) => {
      setOpen(false);
      updateStatus.mutate({ id: request.id, status: newStatus });
    },
    [request.id, updateStatus],
  );

  const currentCfg = STATUS_CONFIG[request.status ?? ''] ?? STATUS_CONFIG['Pending']!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={updateStatus.isPending}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
          'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:opacity-50',
          currentCfg.className,
        )}
      >
        {currentCfg.icon}
        {currentCfg.label}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border bg-popover shadow-lg">
            {STATUS_OPTIONS.map((opt) => {
              const cfg = STATUS_CONFIG[opt]!;
              const isActive = request.status === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                  {cfg.label}
                  {isActive && <Check className="ml-auto h-3 w-3 text-primary" />}
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

function MissingVehicleDetailModal({
  request,
  isOpen,
  onClose,
}: {
  request: MissingVehicleRequest;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description=""
      size="md"
      hideCloseButton
    >
      <div className="flex max-h-[75vh] flex-col gap-0">
        {/* Header */}
        <div className="shrink-0 -mx-6 -mt-6 rounded-t-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-4 pt-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
                <SearchX className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {request.make} {request.model}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Requested {request.createdOn ? formatDate(request.createdOn) : 'Unknown date'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusSelect request={request} />
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
          {/* Vehicle details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Make', value: request.make },
              { label: 'Model', value: request.model },
              { label: 'Year', value: request.modelYear },
              { label: 'Spec / Trim', value: request.trim },
              { label: 'Body Type', value: request.bodyType },
              { label: 'Cylinders', value: request.cylinders },
              { label: 'Fuel Type', value: request.fuelType },
              { label: 'Transmission', value: request.transmissionType },
              { label: 'Status', value: request.status },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border bg-card p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground break-words">
                  {item.value ? String(item.value) : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
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

export function AdminMissingVehiclesPage() {
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<MissingVehicleRequest | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const pageSize = 15;

  const { data: requests, isLoading } = useMissingVehicleRequests();

  // Status counts for the summary bar
  const statusCounts = {
    all: requests?.length ?? 0,
    pending: requests?.filter((r) => r.status === 'Pending' || !r.status).length ?? 0,
    approved: requests?.filter((r) => r.status === 'Approved').length ?? 0,
    inProgress: requests?.filter((r) => r.status === 'In Progress').length ?? 0,
    reject: requests?.filter((r) => r.status === 'Reject').length ?? 0,
  };

  // Filter by search and status
  const filtered = (requests ?? []).filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      req.make.toLowerCase().includes(q) ||
      req.model.toLowerCase().includes(q) ||
      req.trim.toLowerCase().includes(q) ||
      req.bodyType.toLowerCase().includes(q) ||
      String(req.modelYear).includes(q)
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Missing Vehicles</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{requests?.length ?? 0}</span> total requests
              {statusCounts.pending > 0 && (
                <>
                  <span className="mx-1.5 text-muted-foreground/30">·</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {statusCounts.pending} pending
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchX className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search by make, model, year..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-48 rounded-lg border bg-background/50 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:bg-background md:w-72"
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

      {/* Status filter tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-1.5 rounded-xl border bg-card p-1.5 overflow-x-auto">
          {[
            { key: 'all' as const, label: 'All', count: statusCounts.all, color: '' },
            { key: 'Pending' as const, label: 'Pending', count: statusCounts.pending, color: 'bg-amber-500' },
            { key: 'Approved' as const, label: 'Approved', count: statusCounts.approved, color: 'bg-emerald-500' },
            { key: 'In Progress' as const, label: 'In Progress', count: statusCounts.inProgress, color: 'bg-blue-500' },
            { key: 'Reject' as const, label: 'Reject', count: statusCounts.reject, color: 'bg-red-500' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap',
                statusFilter === tab.key
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {tab.color && <span className={cn('h-1.5 w-1.5 rounded-full', tab.color)} />}
              {tab.label}
              <span className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                statusFilter === tab.key
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table card */}
      <motion.div variants={itemVariants}>
        <div className="rounded-2xl border bg-card overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1 bg-gradient-to-r from-primary/60 via-accent/60 to-primary/30" />

          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={8} cols={7} />
            </div>
          ) : paginated.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="w-10 px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Make</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Model</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Year</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Spec / Trim</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Body Type</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requested</th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginated.map((req, i) => (
                    <tr
                      key={req.id}
                      className="group/row transition-colors hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Car className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{req.make}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-foreground">{req.model}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {req.modelYear}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="text-sm text-foreground truncate" title={req.trim}>
                          {req.trim || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-foreground/80">{req.bodyType || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs text-foreground">
                            {req.createdOn ? formatShortDate(req.createdOn) : '—'}
                          </span>
                          {req.createdOn && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(req.createdOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                            onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
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
                <SearchX className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {search || statusFilter !== 'all' ? 'No matching requests' : 'No missing vehicle requests yet'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                {search
                  ? 'Try adjusting your search.'
                  : statusFilter !== 'all'
                    ? `No requests with "${statusFilter}" status.`
                    : 'When users search for vehicles not in the database, they will appear here.'}
              </p>
              {(search || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearch(''); setStatusFilter('all'); }}
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

      {/* Pagination */}
      {sorted.length > pageSize && (
        <motion.div variants={itemVariants}>
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Page <span className="text-foreground">{page}</span> of <span className="text-foreground">{totalPages}</span>
              <span className="mx-2 text-muted-foreground/30">·</span>
              <span>{sorted.length} total</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} title="First page">
                <ChevronLeft className="h-3.5 w-3.5" />
                <ChevronLeft className="-ml-2 h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) =>
                  pageNum === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="min-w-[32px]"
                    >
                      {pageNum}
                    </Button>
                  )
                )}
              </div>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last page">
                <ChevronRight className="h-3.5 w-3.5" />
                <ChevronRight className="-ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Detail modal */}
      {selectedRequest && (
        <MissingVehicleDetailModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </motion.div>
  );
}
