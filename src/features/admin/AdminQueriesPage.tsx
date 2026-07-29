import { useState, useCallback } from 'react';
import { useInquiries, useUpdateInquiryStatus, useExportInquiries } from '@hooks';
import { useDebounce } from '@utils';
import {
  Button,
  Dialog,
  SkeletonTable,
} from '@components/ui';
import { motion } from 'framer-motion';
import {
  Eye,
  X,
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Car,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  User,
  Check,
  ChevronDown,
  Download,
} from 'lucide-react';
import type { Inquiry, InquiryStatus } from '@types';
import { formatCurrency, cn } from '@utils';

// ─── Status helpers ──────────────────────────────────────────────

const STATUS_CONFIG: Record<InquiryStatus, { label: string; icon: React.ReactNode; className: string; dot: string }> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-3 w-3" />,
    className: 'text-[#08766c] bg-[#ecfbf8] border-[#bfe9e2]',
    dot: 'bg-[#19b8a5]',
  },
  reviewed: {
    label: 'Reviewed',
    icon: <Eye className="h-3 w-3" />,
    className: 'text-[#08766c] bg-[#ecfbf8] border-[#bfe9e2]',
    dot: 'bg-[#19b8a5]',
  },
  contacted: {
    label: 'Contacted',
    icon: <MessageSquare className="h-3 w-3" />,
    className: 'text-[#08766c] bg-[#ecfbf8] border-[#bfe9e2]',
    dot: 'bg-[#19b8a5]',
  },
  closed: {
    label: 'Closed',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'text-muted-foreground bg-muted/50 border-border/50',
    dot: 'bg-muted-foreground',
  },
};

const STATUS_OPTIONS: { value: InquiryStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
];

function StatusBadge({ status }: { status: InquiryStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', cfg.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
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

// ─── Status Select ───────────────────────────────────────────────

function StatusSelect({ inquiry }: { inquiry: Inquiry }) {
  const updateStatus = useUpdateInquiryStatus();
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (newStatus: InquiryStatus) => {
      setOpen(false);
      updateStatus.mutate({ id: inquiry.id, status: newStatus });
    },
    [inquiry.id, updateStatus],
  );

  const currentCfg = STATUS_CONFIG[inquiry.status];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={updateStatus.isPending}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
          'hover:bg-[#dff7f4] focus:outline-none focus:ring-2 focus:ring-[#19b8a5]/30',
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
          <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-[10px] border border-[#d9e2e8] bg-white shadow-[0_12px_28px_rgba(7,25,54,0.14)] dark:border-[#31545a] dark:bg-[#071936] dark:shadow-none">
            {STATUS_OPTIONS.map((opt) => {
              const cfg = STATUS_CONFIG[opt.value];
              const isActive = inquiry.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-[#ecfbf8] text-[#08766c]'
                      : 'text-[#647887] hover:bg-[#dff7f4] hover:text-[#08766c] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                  {cfg.label}
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

// ─── Inquiry Detail Modal ────────────────────────────────────────

function InquiryDetailModal({
  inquiry,
  isOpen,
  onClose,
}: {
  inquiry: Inquiry;
  isOpen: boolean;
  onClose: () => void;
}) {
  const vehicle = inquiry.selectedVehicle;
  const vehicleDisplay = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.spec}`.trim();

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description=""
      size="xl"
      hideCloseButton
    >
      <div className="flex max-h-[75vh] flex-col gap-0">
        {/* Header section with gradient */}
        <div className="shrink-0 -mx-6 -mt-6 rounded-t-2xl bg-gradient-to-br from-[#ecfbf8] via-[#f4fbfa] to-transparent px-6 pb-4 pt-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ecfbf8] shadow-sm">
                <User className="h-6 w-6 text-[#19b8a5]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {inquiry.firstName} {inquiry.lastName}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Submitted {formatDate(inquiry.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusSelect inquiry={inquiry} />
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Contact Info */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-3.5">
              <p className="flex items-center gap-1.5 text-xs text-foreground">
                <Mail className="h-3 w-3" />
                Email
              </p>
              <p className="mt-1 text-sm font-medium text-foreground truncate">{inquiry.email}</p>
            </div>
            <div className="rounded-xl border bg-card p-3.5">
              <p className="flex items-center gap-1.5 text-xs text-foreground">
                <Phone className="h-3 w-3" />
                Phone
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{inquiry.phone}</p>
            </div>
          </div>

          {/* Location */}
          <div className="mb-4 rounded-xl border bg-card p-3.5">
            <p className="flex items-center gap-1.5 text-xs text-foreground">
              <MapPin className="h-3 w-3" />
              Location
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {inquiry.city}, {inquiry.country}
            </p>
          </div>

          {/* Selected Vehicle */}
          <div className="mb-4 overflow-hidden rounded-xl border">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
              <Car className="h-4 w-4 text-[#19b8a5]" />
              <span className="text-xs font-medium uppercase tracking-wider text-foreground">Selected Vehicle</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3">
              {[
                { label: 'Year', value: vehicle.year },
                { label: 'Make', value: vehicle.make },
                { label: 'Model', value: vehicle.model },
                { label: 'Spec', value: vehicle.spec },
                { label: 'Body Type', value: vehicle.bodyType },
                { label: 'Trim', value: vehicleDisplay },
              ].map((item) => (
                <div key={item.label} className="px-4 py-2.5">
                  <p className="text-xs text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground truncate" title={String(item.value)}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Valuation Result */}
          {inquiry.valuationResult ? (
            <div className="overflow-hidden rounded-xl border">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
                <TrendingUp className="h-4 w-4 text-[#19b8a5]" />
                <span className="text-xs font-medium uppercase tracking-wider text-foreground">Valuation Result</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="bg-gradient-to-br from-[#ecfbf8] to-transparent p-4">
                  <p className="text-xs text-foreground">Min Price</p>
                  <p className="mt-0.5 text-lg font-semibold text-[#08766c]">
                    {formatCurrency(inquiry.valuationResult.pricing.minimumPrice)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-foreground">Median Price</p>
                  <p className="mt-0.5 text-lg font-semibold text-foreground">
                    {formatCurrency(inquiry.valuationResult.pricing.medianPrice)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-foreground">Max Price</p>
                  <p className="mt-0.5 text-lg font-semibold text-foreground">
                    {formatCurrency(inquiry.valuationResult.pricing.maximumPrice)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No valuation data available for this inquiry.</p>
            </div>
          )}
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

export function AdminQueriesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const pageSize = 15;

  const { data: inquiries, isLoading } = useInquiries();
  const exportInquiries = useExportInquiries();

  // Filter by search and status
  const filtered = (inquiries ?? []).filter((inq) => {
    if (statusFilter !== 'all' && inq.status !== statusFilter) return false;
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      inq.firstName.toLowerCase().includes(q) ||
      inq.lastName.toLowerCase().includes(q) ||
      inq.email.toLowerCase().includes(q) ||
      inq.phone.includes(q) ||
      `${inq.selectedVehicle.year} ${inq.selectedVehicle.make} ${inq.selectedVehicle.model} ${inq.selectedVehicle.spec}`.toLowerCase().includes(q)
    );
  });

  // Sort by newest first
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Status counts for the summary bar
  const statusCounts = {
    all: inquiries?.length ?? 0,
    pending: inquiries?.filter((i) => i.status === 'pending').length ?? 0,
    reviewed: inquiries?.filter((i) => i.status === 'reviewed').length ?? 0,
    contacted: inquiries?.filter((i) => i.status === 'contacted').length ?? 0,
    closed: inquiries?.filter((i) => i.status === 'closed').length ?? 0,
  };

  const getPageNumbers = useCallback(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
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
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Queries</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{inquiries?.length ?? 0}</span> total inquiries
              {statusCounts.pending > 0 && (
                <>
                  <span className="mx-1.5 text-muted-foreground/30">·</span>
                  <span className="font-medium text-[#08766c] dark:text-[#19b8a5]">
                    {statusCounts.pending} pending
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportInquiries}
              disabled={!inquiries?.length}
              title="Export all inquiries as CSV"
              className="!border-[#d9e2e8] !bg-white !text-[#19b8a5] hover:!border-[#19b8a5]/50 hover:!bg-[#ecfbf8] hover:!text-[#08766c] dark:!border-[#31545a] dark:!bg-[#0c2530] dark:!text-[#19b8a5] dark:hover:!bg-[#0f3f43]"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search by name, email, vehicle..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-48 rounded-[10px] border border-[#d9e2e8] bg-white pl-9 pr-3 text-sm text-[#071936] outline-none transition-colors placeholder:text-[#b8c5cc] hover:border-[#b7cbd5] focus:border-[#19b8a5]/60 focus:bg-white focus:ring-2 focus:ring-[#19b8a5]/15 dark:border-[#31545a] dark:bg-[#0c2530] dark:text-white dark:placeholder:text-[#6f8d99] dark:hover:border-[#19b8a5]/50 dark:focus:bg-[#0c2530] md:w-72"
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
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-[12px] border-0 bg-white p-1.5 shadow-[0_8px_20px_rgba(18,38,63,0.05)] dark:bg-[#0c2530] dark:shadow-none">
          {[
            { key: 'all' as const, label: 'All', count: statusCounts.all, color: '' },
            { key: 'pending' as const, label: 'Pending', count: statusCounts.pending, color: 'bg-[#19b8a5]' },
            { key: 'reviewed' as const, label: 'Reviewed', count: statusCounts.reviewed, color: 'bg-[#19b8a5]' },
            { key: 'contacted' as const, label: 'Contacted', count: statusCounts.contacted, color: 'bg-[#19b8a5]' },
            { key: 'closed' as const, label: 'Closed', count: statusCounts.closed, color: 'bg-muted-foreground' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap',
                statusFilter === tab.key
                  ? 'bg-[#ecfbf8] text-[#08766c] shadow-sm'
                  : 'text-[#647887] hover:bg-[#dff7f4] hover:text-[#08766c] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]',
              )}
            >
              {tab.color && <span className={cn('h-1.5 w-1.5 rounded-full', tab.color)} />}
              {tab.label}
              <span className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                statusFilter === tab.key
                  ? 'bg-[#dff7f4] text-[#08766c]'
                  : 'bg-[#f4f8fb] text-[#8aa0ad] dark:bg-[#071936] dark:text-[#8fb6cc]',
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
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={8} cols={8} />
            </div>
          ) : paginated.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5edf2] bg-[#f4f8fb] dark:border-[#17383d] dark:bg-[#071936]">
                    <th className="w-10 px-4 py-3.5 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">#</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">Customer</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">Contact</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">Vehicle</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">Body Type</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">Status</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">Date</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginated.map((inquiry, i) => {
                    const vehicleDisplay = `${inquiry.selectedVehicle.year} ${inquiry.selectedVehicle.make} ${inquiry.selectedVehicle.model}`.trim();
                    return (
                      <tr
                        key={inquiry.id}
                        className="group/row transition-colors hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelectedInquiry(inquiry)}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                              STATUS_CONFIG[inquiry.status].className,
                            )}>
                              {inquiry.firstName[0]}{inquiry.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-foreground whitespace-nowrap">
                                {inquiry.firstName} {inquiry.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {inquiry.city}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-xs text-foreground/80 whitespace-nowrap flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-muted-foreground/50" />
                              {inquiry.email}
                            </p>
                            <p className="text-xs text-foreground/80 whitespace-nowrap flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-muted-foreground/50" />
                              {inquiry.phone}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-sm font-medium text-foreground truncate" title={vehicleDisplay}>
                            {vehicleDisplay}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{inquiry.selectedVehicle.spec}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-foreground/80">{inquiry.selectedVehicle.bodyType}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={inquiry.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground">{formatShortDate(inquiry.createdAt)}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(inquiry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="View details"
                              onClick={(e) => { e.stopPropagation(); setSelectedInquiry(inquiry); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50">
                <ClipboardList className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {search || statusFilter !== 'all' ? 'No matching inquiries' : 'No inquiries yet'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                {search
                  ? 'Try adjusting your search or filter.'
                  : statusFilter !== 'all'
                    ? `No inquiries with "${STATUS_CONFIG[statusFilter as InquiryStatus]?.label}" status.`
                    : 'When users complete a valuation on the portal, their details will appear here.'}
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
                        'h-9 min-w-9 rounded-[10px] px-3 text-xs font-semibold shadow-[0_6px_14px_rgba(18,38,63,0.05)]',
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

      {/* Inquiry detail modal */}
      {selectedInquiry && (
        <InquiryDetailModal
          inquiry={selectedInquiry}
          isOpen={!!selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
        />
      )}
    </motion.div>
  );
}
