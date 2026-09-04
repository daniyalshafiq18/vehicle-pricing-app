import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useMissingVehicleRequests,
  useUpdateMissingVehicleRequestStatus,
  useTriggerScrape,
  useTriggerMultiSourceScrape,
  useProcessScrapeInbox,
} from '@hooks';
import {
  Button,
  Dialog,
  Input,
  SkeletonTable,
  Card as UICard,
  CardContent,
} from '@components/ui';
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
  LayoutList,
  LayoutGrid,
  User,
  Globe,
  ExternalLink,
  Loader,
  Inbox,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MissingVehicleRequest } from '@types';
import type { MultiSourceScrapeExecutionResult } from '@lib/multiSourceScrapeExecution';
import type { OrchestratedScrapeSource } from '@lib/multiSourceOrchestrator';
import { cn, formatCurrency } from '@utils';
import { buildDriveArabiaModelYearUrl } from '@lib/driveArabiaUrl';
import { VehicleScrapeEvidencePanel } from '@features/admin/VehicleScrapeEvidencePanel';

// ─── Status helpers ────────────────────────────────────────────

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Reject'] as const;

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; className: string; dot: string }
> = {
  Pending: {
    label: 'Pending',
    icon: <Clock className="h-3 w-3" />,
    className:
      'border-[#bfe9e2] bg-[#ecfbf8] text-[#08766c] dark:border-[#19b8a5]/35 dark:bg-[#0f3f43] dark:text-[#5eead4]',
    dot: 'bg-[#19b8a5]',
  },
  Approved: {
    label: 'Approved',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className:
      'border-[#b7ead4] bg-[#eefbf5] text-[#067647] dark:border-[#34d399]/35 dark:bg-[#0f3328] dark:text-[#86efac]',
    dot: 'bg-[#22c55e]',
  },
  'In Progress': {
    label: 'In Progress',
    icon: <AlertCircle className="h-3 w-3" />,
    className:
      'border-[#c9d8ff] bg-[#eef4ff] text-[#315caa] dark:border-[#5b7cc8]/40 dark:bg-[#102748] dark:text-[#9db8ff]',
    dot: 'bg-[#5b7cc8]',
  },
  Reject: {
    label: 'Reject',
    icon: <XCircle className="h-3 w-3" />,
    className:
      'border-[#f4c7c7] bg-[#fff0f0] text-[#b42323] dark:border-[#fca5a5]/35 dark:bg-[#3a161a] dark:text-[#fca5a5]',
    dot: 'bg-[#ef4444]',
  },
};

// ─── Scrape Status helpers ──────────────────────────────────────────

const SCRAPE_STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  Pending: {
    label: 'Pending',
    className:
      'border-[#e5edf2] bg-[#F6F9FB] text-[#647887] dark:border-[#31545a] dark:bg-[#071936] dark:text-[#8fb6cc]',
    dot: 'bg-[#8aa0ad]',
  },
  Testing: {
    label: 'Testing',
    className:
      'border-[#c9d8ff] bg-[#eef4ff] text-[#315caa] dark:border-[#5b7cc8]/40 dark:bg-[#102748] dark:text-[#9db8ff]',
    dot: 'bg-[#5b7cc8]',
  },
  'In Progress': {
    label: 'In Progress',
    className:
      'border-[#c9d8ff] bg-[#eef4ff] text-[#315caa] dark:border-[#5b7cc8]/40 dark:bg-[#102748] dark:text-[#9db8ff]',
    dot: 'bg-[#5b7cc8]',
  },
  Scraped: {
    label: 'Scraped',
    className:
      'border-[#b7ead4] bg-[#eefbf5] text-[#067647] dark:border-[#34d399]/35 dark:bg-[#0f3328] dark:text-[#86efac]',
    dot: 'bg-[#22c55e]',
  },
  Failed: {
    label: 'Failed',
    className:
      'border-[#f4c7c7] bg-[#fff0f0] text-[#b42323] dark:border-[#fca5a5]/35 dark:bg-[#3a161a] dark:text-[#fca5a5]',
    dot: 'bg-[#ef4444]',
  },
  Unreachable: {
    label: 'Unreachable',
    className:
      'border-[#f4c7c7] bg-[#fff0f0] text-[#b42323] dark:border-[#fca5a5]/35 dark:bg-[#3a161a] dark:text-[#fca5a5]',
    dot: 'bg-[#ef4444]',
  },
};

function ScrapeStatusBadge({ status }: { status: string | undefined }) {
  const cfg = SCRAPE_STATUS_CONFIG[status ?? ''];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted/30 px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        {status || '—'}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        cfg.className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

/** Safely parse the scrapedListings JSON field into an object. */
function parseScrapedListings(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function StatusBadge({ status }: { status: string | undefined }) {
  const cfg = STATUS_CONFIG[status ?? ''];
  if (!cfg) {
    const fallback = STATUS_CONFIG['Pending']!;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
          fallback.className,
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', fallback.dot)} />
        {status || 'Pending'}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cfg.className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function StatusSelect({ request }: { request: MissingVehicleRequest }) {
  const updateStatus = useUpdateMissingVehicleRequestStatus();
  const [open, setOpen] = useState(false);
  const isPending = updateStatus.isPending;
  const isFinalized = request.status === 'Approved';

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
        disabled={isPending || isFinalized}
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
          <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-[10px] border border-[#d9e2e8] bg-white shadow-[0_12px_28px_rgba(7,25,54,0.14)] dark:border-[#31545a] dark:bg-[#071936] dark:shadow-none">
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
                      ? 'bg-[#ecfbf8] text-[#08766c]'
                      : 'text-[#647887] hover:bg-[#dff7f4] hover:text-[#08766c]',
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
  const scrape = parseScrapedListings(request.scrapedListings);
  // Prefer the dedicated vpi_mileage column; fall back to the scraped-listings JSON value.
  const mileageLabel = (() => {
    if (request.mileage != null) return `${request.mileage.toLocaleString()} km`;
    const raw = scrape && scrape.mileage != null ? String(scrape.mileage).replace(/\D/g, '') : '';
    return raw ? `${Number(raw).toLocaleString()} km` : null;
  })();
  const driveArabiaUrl = buildDriveArabiaModelYearUrl({
    make: request.make,
    model: request.model,
    year: request.modelYear,
  });

  const copyDriveArabiaUrl = async () => {
    try {
      await navigator.clipboard.writeText(driveArabiaUrl);
      toast.success('DriveArabia PAD URL copied');
    } catch {
      toast.error('Could not copy the DriveArabia URL');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="" description="" size="xl" hideCloseButton>
      <div className="flex max-h-[75vh] flex-col gap-0 text-[#071936] dark:text-white">
        {/* Header */}
        <div className="-mx-6 -mt-6 shrink-0 rounded-t-2xl border-b border-[#d9e2e8] bg-white px-6 pb-4 pt-5 dark:border-[#31545a] dark:bg-[#0c2530]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ecfbf8] shadow-sm dark:bg-[#0f3f43]">
                <SearchX className="h-6 w-6 text-[#19b8a5]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#071936] dark:text-white">
                  {request.name ||
                    [request.make, request.model, request.trim].filter(Boolean).join(' ')}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#647887] dark:text-[#b8cbd4]">
                  <Calendar className="h-3 w-3" />
                  Requested {request.createdOn ? formatDate(request.createdOn) : 'Unknown date'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyDriveArabiaUrl}
                aria-label="Copy DriveArabia PAD URL"
                title={`Copy ${request.make} ${request.model} ${request.modelYear} URL for the attended PAD flow`}
              >
                <Copy className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Copy PAD URL</span>
              </Button>
              <StatusSelect request={request} />
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c] dark:text-[#b8cbd4] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Vehicle details (grouped) */}
          <div className="space-y-4">
            {[
              {
                title: 'Vehicle Specifications',
                items: [
                  { label: 'Body Type', value: request.bodyType },
                  {
                    label: 'Engine Size',
                    value: request.engineSize ? `${request.engineSize} cc` : null,
                  },
                  { label: 'Cylinders', value: request.cylinders },
                  { label: 'Fuel Type', value: request.fuelType },
                  { label: 'Transmission', value: request.transmissionType },
                  { label: 'Drive Type', value: request.driveType },
                  { label: 'Doors', value: request.doors },
                  { label: 'Mileage', value: mileageLabel },
                ],
              },
              {
                title: 'Requester',
                items: [
                  { label: 'Requested By', value: request.contactName || request.contactEmail },
                  { label: 'Contact Email', value: request.contactEmail },
                ],
              },
            ].map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <div key={item.label} className="rounded-xl border bg-card p-3.5">
                      <p className="text-xs text-foreground">{item.label}</p>
                      <p className="mt-1 break-words text-sm font-medium text-foreground">
                        {item.value ? String(item.value) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <VehicleScrapeEvidencePanel request={request} />

          {/* ── Scrape Results Section ── */}
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ecfbf8]">
                <Loader className="h-3.5 w-3.5 text-[#19b8a5]" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Scrape Results</h3>
              <ScrapeStatusBadge status={request.scrapeStatus} />
              <div className="ml-auto w-full sm:w-auto">
                <ProcessPadInboxButton request={request} />
              </div>
            </div>

            {request.scrapeStatus === 'Scraped' || request.scrapedListings ? (
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const parsed = parseScrapedListings(request.scrapedListings);
                  if (parsed) {
                    return (
                      <>
                        <div className="rounded-xl border bg-card p-3.5">
                          <p className="text-xs text-foreground">Listings Found</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {String(parsed.count ?? '—')}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-card p-3.5">
                          <p className="text-xs text-foreground">Source</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {String(parsed.source ?? '—')}
                          </p>
                        </div>
                        {parsed.transport ? (
                          <div className="rounded-xl border bg-card p-3.5">
                            <p className="text-xs text-foreground">Transport</p>
                            <p className="mt-1 text-sm font-medium uppercase text-foreground">
                              {String(parsed.transport)}
                            </p>
                          </div>
                        ) : null}
                      </>
                    );
                  }
                  return null;
                })()}
                {request.scrapedMinPrice != null && (
                  <div className="rounded-xl border bg-card p-3.5">
                    <p className="text-xs text-foreground">Scraped Min Price</p>
                    <p className="mt-1 text-sm font-semibold text-success">
                      {formatCurrency(request.scrapedMinPrice)}
                    </p>
                  </div>
                )}
                {request.scrapedMaxPrice != null && (
                  <div className="rounded-xl border bg-card p-3.5">
                    <p className="text-xs text-foreground">Scraped Max Price</p>
                    <p className="mt-1 text-sm font-semibold text-success">
                      {formatCurrency(request.scrapedMaxPrice)}
                    </p>
                  </div>
                )}
                {request.scrapedSources && (
                  <div className="col-span-2 rounded-xl border bg-card p-3.5">
                    <p className="text-xs text-foreground">Source URL</p>
                    <a
                      href={request.scrapedSources}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-medium text-[#08766c] hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      {request.scrapedSources}
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </a>
                  </div>
                )}
                {request.scrapedListings && !parseScrapedListings(request.scrapedListings) && (
                  <div className="col-span-2 rounded-xl border bg-card p-3.5">
                    <p className="text-xs text-foreground">Raw Scraped Data</p>
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted/50 p-2 text-xs text-foreground">
                      {request.scrapedListings}
                    </pre>
                  </div>
                )}
              </div>
            ) : request.scrapeStatus && request.scrapeStatus !== 'Pending' ? (
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <p className="mb-3 text-sm text-muted-foreground">
                  {request.scrapeStatus === 'In Progress'
                    ? 'Scraping is currently in progress...'
                    : request.scrapeStatus === 'Failed'
                      ? 'Scraping failed. Try again or check the flow run history.'
                      : request.scrapeStatus === 'Unreachable'
                        ? 'The source website was unreachable during scraping. You can retry.'
                        : `Scrape status: ${request.scrapeStatus}`}
                </p>
                {(request.scrapeStatus === 'Failed' || request.scrapeStatus === 'Unreachable') && (
                  <div className="flex justify-center">
                    <ScrapeNowButton request={request} />
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <p className="mb-3 text-sm text-muted-foreground">
                  No scrape results yet. Scraping is done manually from the admin panel.
                </p>
                <div className="flex justify-center">
                  <ScrapeNowButton request={request} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/** A small helper to format a listings count from scrapedListings JSON. */
function ScrapedListingCount({ listings }: { listings: string | undefined }) {
  const parsed = parseScrapedListings(listings);
  if (!parsed || parsed.count == null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#ecfbf8] px-2 py-0.5 text-xs font-medium text-[#08766c]">
      <SearchX className="h-3 w-3" />
      {String(parsed.count)} listings
    </span>
  );
}

// ─── Scrape Now Button ────────────────────────────────────────────

function ScrapeNowButton({
  request,
  size = 'sm',
  onComplete,
}: {
  request: MissingVehicleRequest;
  size?: 'sm' | 'icon-sm';
  onComplete?: (id: string) => void;
}) {
  const triggerScrape = useTriggerMultiSourceScrape();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<OrchestratedScrapeSource[]>([
    'YallaMotor',
    'DriveArabia',
  ]);
  const [result, setResult] = useState<MultiSourceScrapeExecutionResult | null>(null);

  const openDialog = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setResult(null);
    triggerScrape.reset();
    setSelectedSources(['YallaMotor', 'DriveArabia']);
    setIsOpen(true);
  };

  const isPending = triggerScrape.isPending;

  const closeDialog = () => {
    if (isPending) {
      return;
    }
    setIsOpen(false);
    setResult(null);
  };

  const toggleSource = (source: OrchestratedScrapeSource) => {
    setSelectedSources((current) =>
      current.includes(source)
        ? current.filter((candidate) => candidate !== source)
        : [...current, source],
    );
  };

  const startScrape = async () => {
    try {
      const outcome = await triggerScrape.mutateAsync({
        request,
        sources: selectedSources,
      });
      setResult(outcome);
      if (outcome.yallaMotorResult || outcome.driveArabiaInboxSummary?.completedItems === 1) {
        onComplete?.(request.id);
      }
    } catch {
      // Preparation errors are surfaced by the hook and kept in the dialog.
    }
  };

  const copyCorrelatedUrl = async () => {
    if (!result?.driveArabiaPadUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.driveArabiaPadUrl);
      toast.success('Correlated DriveArabia PAD URL copied');
    } catch {
      toast.error('Could not copy the correlated PAD URL');
    }
  };

  const triggerButton =
    size === 'icon-sm' ? (
      <Button
        variant="ghost"
        size="icon-sm"
        className="!text-[#647887] hover:!bg-[#dff7f4] hover:!text-[#08766c] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]"
        title={`Choose scrape sources for ${request.make} ${request.model}`}
        onClick={openDialog}
        disabled={isPending}
      >
        <RotateCcw className={cn('h-4 w-4', isPending && 'animate-spin')} />
      </Button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        className="!border-[#bfe9e2] !bg-white !text-[#08766c] hover:!bg-[#dff7f4] hover:!text-[#08766c] dark:!border-[#31545a] dark:!bg-[#0c2530] dark:!text-[#19b8a5] dark:hover:!bg-[#0f3f43]"
        onClick={openDialog}
        disabled={isPending}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Scrape
      </Button>
    );

  return (
    <>
      {triggerButton}
      <Dialog
        isOpen={isOpen}
        onClose={closeDialog}
        title="Choose scrape sources"
        description={`${request.make} ${request.model} ${request.trim} ${request.modelYear}`}
        size="sm"
      >
        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              One shared scrape Run will keep each source's prices and specifications
              separate for later review.
            </p>
            <div className="space-y-2.5">
              {(
                [
                  {
                    source: 'YallaMotor' as const,
                    title: 'YallaMotor',
                    description: 'Used-market asking prices. Runs immediately in the cloud.',
                  },
                  {
                    source: 'DriveArabia' as const,
                    title: 'DriveArabia',
                    description:
                      'Original reference prices and specs. Runs through PAD automatically when the secured cloud flow is configured.',
                  },
                ] satisfies Array<{
                  source: OrchestratedScrapeSource;
                  title: string;
                  description: string;
                }>
              ).map((option) => (
                <label
                  key={option.source}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors',
                    selectedSources.includes(option.source)
                      ? 'border-[#19b8a5] bg-[#ecfbf8] dark:border-[#19b8a5]/60 dark:bg-[#0f3f43]'
                      : 'border-border bg-card hover:bg-muted/40',
                    isPending && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#19b8a5]"
                    checked={selectedSources.includes(option.source)}
                    onChange={() => toggleSource(option.source)}
                    disabled={isPending}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {option.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {triggerScrape.error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {triggerScrape.error.message}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={closeDialog} disabled={isPending}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={startScrape}
                disabled={isPending || selectedSources.length === 0}
              >
                {isPending ? (
                  <>
                    <span className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Preparing...
                  </>
                ) : (
                  'Start scrape'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#b7ead4] bg-[#eefbf5] p-3.5 dark:border-[#34d399]/35 dark:bg-[#0f3328]">
              <p className="text-sm font-semibold text-[#067647] dark:text-[#86efac]">
                Shared scrape Run prepared
              </p>
              <p className="mt-1 text-xs text-[#067647]/80 dark:text-[#86efac]/80">
                {result.prepared.sources.length} source
                {result.prepared.sources.length === 1 ? '' : 's'} requested.
              </p>
            </div>

            {selectedSources.includes('YallaMotor') && (
              <div className="rounded-xl border bg-card p-3.5">
                <p className="text-sm font-semibold text-foreground">YallaMotor</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.yallaMotorResult
                    ? `${result.yallaMotorResult.count} listings captured.`
                    : result.sourceErrors.find((failure) => failure.source === 'YallaMotor')
                        ?.error ?? 'No immediate result was returned.'}
                </p>
              </div>
            )}

            {result.driveArabiaInboxSummary?.completedItems === 1 ? (
              <div className="rounded-xl border border-[#b7ead4] bg-[#eefbf5] p-3.5 dark:border-[#34d399]/35 dark:bg-[#0f3328]">
                <p className="text-sm font-semibold text-[#067647] dark:text-[#86efac]">
                  DriveArabia completed automatically
                </p>
                <p className="mt-1 text-xs text-[#067647]/80 dark:text-[#86efac]/80">
                  PAD captured the page, returned its exact Inbox ID, and the app processed the
                  correlated evidence without a manual inbox action.
                </p>
              </div>
            ) : result.driveArabiaPadUrl ? (
              <div className="space-y-3 rounded-xl border border-[#c9d8ff] bg-[#eef4ff] p-3.5 dark:border-[#5b7cc8]/40 dark:bg-[#102748]">
                <div>
                  <p className="text-sm font-semibold text-[#315caa] dark:text-[#9db8ff]">
                    DriveArabia attended fallback
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#315caa]/80 dark:text-[#9db8ff]/80">
                    {result.sourceErrors.find((failure) => failure.source === 'DriveArabia')
                      ?.error ??
                      'The Dataverse-triggered desktop automation did not complete. Use this exact correlated URL only for diagnosis or a controlled retry.'}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-2 text-xs text-[#071936] dark:bg-[#071936] dark:text-white">
                  <p className="max-h-20 overflow-auto break-all">
                    {result.driveArabiaPadUrl}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={copyCorrelatedUrl}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy correlated PAD URL
                </Button>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button size="sm" onClick={closeDialog}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

// ─── Scrape All Pending Button ─────────────────────────────────────

function ScrapeAllPendingButton({ requests }: { requests: MissingVehicleRequest[] }) {
  const triggerScrape = useTriggerScrape();
  const [isScrapingAll, setIsScrapingAll] = useState(false);

  const pendingRequests = requests.filter(
    (r) =>
      !r.scrapeStatus ||
      r.scrapeStatus === 'Pending' ||
      r.scrapeStatus === 'Failed' ||
      r.scrapeStatus === 'Unreachable',
  );

  const handleScrapeAll = async () => {
    if (pendingRequests.length === 0) return;
    setIsScrapingAll(true);

    for (const req of pendingRequests) {
      try {
        await triggerScrape.mutateAsync({
          id: req.id,
          make: req.make,
          model: req.model,
          trim: req.trim,
          year: req.modelYear,
        });
      } catch {
        // Individual failures are handled by the hook's onError
      }
    }

    setIsScrapingAll(false);
  };

  if (pendingRequests.length === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="!border-[#bfe9e2] !bg-white !text-[#08766c] hover:!bg-[#dff7f4] hover:!text-[#08766c] dark:!border-[#31545a] dark:!bg-[#0c2530] dark:!text-[#19b8a5] dark:hover:!bg-[#0f3f43]"
      onClick={handleScrapeAll}
      disabled={isScrapingAll}
      title={`Scrape all ${pendingRequests.length} pending items from YallaMotor only`}
    >
      {isScrapingAll ? (
        <>
          <span className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Scraping...
        </>
      ) : (
        <>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          YallaMotor · {pendingRequests.length} Pending
        </>
      )}
    </Button>
  );
}

function ProcessPadInboxButton({ request }: { request: MissingVehicleRequest }) {
  const processInbox = useProcessScrapeInbox();
  const [inboxId, setInboxId] = useState('');
  const normalizedInboxId = inboxId.trim();

  const handleProcess = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[0-9a-f]{12}$/i.test(normalizedInboxId)) {
      toast.error('Enter the 12-character Inbox ID returned by PAD');
      return;
    }
    processInbox.mutate({ requests: [request], inboxId: normalizedInboxId });
  };

  return (
    <form className="flex w-full items-center gap-2 sm:w-auto" onSubmit={handleProcess}>
      <Input
        value={inboxId}
        onChange={(event) => setInboxId(event.target.value)}
        aria-label="PAD Inbox ID"
        placeholder="Inbox ID"
        autoComplete="off"
        spellCheck={false}
        maxLength={12}
        className="h-9 min-w-0 flex-1 font-mono text-xs sm:w-36 sm:flex-none"
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="whitespace-nowrap !border-[#c9d8ff] !bg-white !text-[#315caa] hover:!bg-[#eef4ff] dark:!border-[#5b7cc8]/40 dark:!bg-[#0c2530] dark:!text-[#9db8ff] dark:hover:!bg-[#102748]"
        disabled={processInbox.isPending}
        title={`Process the exact PAD Inbox ID only for ${request.make} ${request.model} ${request.trim} ${request.modelYear}`}
      >
        <Inbox
          className={cn('mr-1.5 h-3.5 w-3.5', processInbox.isPending && 'animate-pulse')}
        />
        {processInbox.isPending ? 'Processing PAD...' : 'Process PAD Capture'}
      </Button>
    </form>
  );
}

// ─── Missing Vehicle Card (Card View) ──────────────────────────────

function MissingVehicleCard({
  request,
  onClick,
}: {
  request: MissingVehicleRequest;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[request.status ?? ''] ?? STATUS_CONFIG['Pending']!;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group h-full"
    >
      <UICard className="h-full overflow-hidden border-0 bg-white shadow-[0_10px_28px_rgba(18,38,63,0.07)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(18,38,63,0.11)] dark:bg-[#0c2530] dark:shadow-[0_18px_38px_rgba(0,0,0,0.25)]">
        <CardContent className="flex h-full flex-col p-5">
          {/* Header: make model trim (+ year badge) + status */}
          <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold leading-tight text-foreground">
                {request.name ||
                  [request.make, request.model, request.trim].filter(Boolean).join(' ')}
              </h3>
              {request.modelYear && (
                <span className="mt-1 inline-flex items-center rounded-full border border-[#d9e2e8] bg-[#f4f8fb] px-2.5 py-0.5 text-xs font-semibold text-[#071936] dark:border-[#31545a] dark:bg-[#071936] dark:text-white">
                  {request.modelYear}
                </span>
              )}
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                cfg.className,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Body Type', value: request.bodyType },
              {
                label: 'Engine Size',
                value: request.engineSize ? `${request.engineSize} cc` : null,
              },
              { label: 'Cylinders', value: request.cylinders ? String(request.cylinders) : null },
              { label: 'Fuel Type', value: request.fuelType },
              { label: 'Transmission', value: request.transmissionType },
              { label: 'Drive Type', value: request.driveType },
            ].map((spec) => (
              <div
                key={spec.label}
                className="rounded-lg bg-[#f7fafc] p-3 transition-colors hover:bg-[#eef6f7] dark:bg-[#071936] dark:hover:bg-[#0f3440]"
              >
                <p className="text-xs font-medium text-[#7d93a5] dark:text-[#9fb8c5]">
                  {spec.label}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {spec.value || '—'}
                </p>
              </div>
            ))}
          </div>

          {/* Scrape info */}
          {request.scrapeStatus && request.scrapeStatus !== 'Pending' && (
            <div className="mt-3 shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                <ScrapeStatusBadge status={request.scrapeStatus} />
                <ScrapedListingCount listings={request.scrapedListings} />
              </div>
              {(request.scrapedMinPrice != null || request.scrapedMaxPrice != null) && (
                <div className="flex items-center gap-3 rounded-lg border border-[#d9e2e8] bg-[#f7fafc] p-3 dark:border-[#31545a] dark:bg-[#071936]">
                  {request.scrapedMinPrice != null && (
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[#7d93a5] dark:text-[#9fb8c5]">
                        Scraped Min
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-[#08766c] dark:text-[#19b8a5]">
                        {formatCurrency(request.scrapedMinPrice)}
                      </p>
                    </div>
                  )}
                  {request.scrapedMinPrice != null && request.scrapedMaxPrice != null && (
                    <div className="h-8 w-px bg-[#d9e2e8] dark:bg-[#31545a]" />
                  )}
                  {request.scrapedMaxPrice != null && (
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[#7d93a5] dark:text-[#9fb8c5]">
                        Scraped Max
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-[#08766c] dark:text-[#19b8a5]">
                        {formatCurrency(request.scrapedMaxPrice)}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {(request.scrapeStatus === 'Failed' || request.scrapeStatus === 'Unreachable') && (
                <div className="flex justify-end">
                  <ScrapeNowButton request={request} />
                </div>
              )}
            </div>
          )}
          {(!request.scrapeStatus || request.scrapeStatus === 'Pending') && (
            <div className="mt-3 shrink-0">
              <div className="flex items-center gap-2">
                <ScrapeStatusBadge status={request.scrapeStatus} />
                <ScrapeNowButton request={request} />
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer: requested by + action */}
          <div className="mt-3 flex shrink-0 items-center justify-between border-t border-[#e4edf1] pt-3 dark:border-[#244852]">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#071936] dark:text-white">Requested by</p>
              <p
                className="truncate text-sm font-medium text-foreground"
                title={request.contactName || request.contactEmail || ''}
              >
                <User className="mr-1 inline h-3 w-3 text-muted-foreground/60" />
                {request.contactName || request.contactEmail || '—'}
              </p>
              {request.createdOn && (
                <p className="text-xs text-muted-foreground/60">
                  {new Date(request.createdOn).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              title="View details"
              onClick={onClick}
              className="text-[#071936] hover:bg-[#dff7f4] hover:text-[#08766c] dark:text-white dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </UICard>
    </motion.div>
  );
}

// ─── Card View Skeleton ────────────────────────────────────────────

function MissingVehicleCardSkeleton() {
  return (
    <div className="h-[380px] animate-pulse rounded-lg border-0 bg-white p-5 shadow-[0_10px_28px_rgba(18,38,63,0.07)] dark:bg-[#0c2530]">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
        <div className="h-6 w-20 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, j) => (
          <div key={j} className="h-[60px] rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="mt-3 h-[68px] rounded-xl bg-muted/50" />
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div className="h-4 w-32 rounded bg-muted" />
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

const CARD_BATCH_SIZE = 18;

// ─── Main Page ───────────────────────────────────────────────────

export function AdminMissingVehiclesPage() {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<MissingVehicleRequest | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const [cardLimit, setCardLimit] = useState(CARD_BATCH_SIZE);
  const cardLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 15;

  const { data: requests, isLoading } = useMissingVehicleRequests();

  useEffect(() => {
    if (!selectedRequest || !requests) {
      return;
    }
    const refreshed = requests.find((request) => request.id === selectedRequest.id);
    if (refreshed && refreshed !== selectedRequest) {
      setSelectedRequest(refreshed);
    }
  }, [requests, selectedRequest]);

  // Status counts for the summary bar + filter tabs
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
  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.createdOn ? new Date(a.createdOn).getTime() : 0;
    const bDate = b.createdOn ? new Date(b.createdOn).getTime() : 0;
    return bDate - aDate;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated =
    viewMode === 'card'
      ? sorted.slice(0, cardLimit)
      : sorted.slice((page - 1) * pageSize, page * pageSize);
  const hasMoreCards = viewMode === 'card' && paginated.length < sorted.length;

  useEffect(() => {
    setCardLimit(CARD_BATCH_SIZE);
  }, [search, statusFilter]);

  useEffect(() => {
    if (viewMode !== 'card' || !hasMoreCards) {
      return undefined;
    }
    const node = cardLoadMoreRef.current;
    if (!node) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setCardLimit((current) => current + CARD_BATCH_SIZE);
        }
      },
      { rootMargin: '500px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewMode, hasMoreCards, paginated.length]);

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
              <span className="font-medium text-foreground">{requests?.length ?? 0}</span> total
              requests
              {statusCounts.pending > 0 && (
                <>
                  <span className="mx-1.5 text-muted-foreground/30">·</span>
                  <span className="font-medium text-[#08766c]">{statusCounts.pending} pending</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Scrape All Pending */}
            {statusFilter === 'all' || statusFilter === 'Pending' ? (
              <ScrapeAllPendingButton requests={requests ?? []} />
            ) : null}
            <div className="relative">
              <SearchX className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search by make, model, year..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCardLimit(CARD_BATCH_SIZE);
                  setPage(1);
                }}
                className="h-9 w-48 rounded-[10px] border border-[#d9e2e8] bg-white pl-9 pr-3 text-sm text-[#071936] outline-none transition-colors placeholder:text-[#b8c5cc] hover:border-[#b7cbd5] focus:border-[#19b8a5]/60 focus:bg-white focus:ring-2 focus:ring-[#19b8a5]/15 dark:border-[#31545a] dark:bg-[#0c2530] dark:text-white dark:placeholder:text-[#6f8d99] dark:hover:border-[#19b8a5]/50 dark:focus:bg-[#0c2530] md:w-72"
              />
            </div>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setCardLimit(CARD_BATCH_SIZE);
                  setPage(1);
                }}
              >
                <RotateCcw className="mr-1.5 h-3 w-3" />
                Clear
              </Button>
            )}
            <div className="flex items-center rounded-[10px] border border-[#d9e2e8] bg-white p-0.5 shadow-[0_6px_14px_rgba(18,38,63,0.05)] dark:border-[#31545a] dark:bg-[#0c2530] dark:shadow-none">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[8px] text-sm font-medium transition-all',
                  viewMode === 'table'
                    ? 'bg-[#ecfbf8] text-[#08766c] shadow-sm dark:bg-[#0f3f43] dark:text-[#19b8a5]'
                    : 'text-[#647887] hover:bg-[#dff7f4] hover:text-[#08766c] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]',
                )}
                title="Table view"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setViewMode('card');
                  setCardLimit(CARD_BATCH_SIZE);
                }}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[8px] text-sm font-medium transition-all',
                  viewMode === 'card'
                    ? 'bg-[#ecfbf8] text-[#08766c] shadow-sm dark:bg-[#0f3f43] dark:text-[#19b8a5]'
                    : 'text-[#647887] hover:bg-[#dff7f4] hover:text-[#08766c] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]',
                )}
                title="Card view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status filter tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-[12px] border-0 bg-white p-1.5 shadow-[0_8px_20px_rgba(18,38,63,0.05)] dark:bg-[#0c2530] dark:shadow-none">
          {[
            { key: 'all' as const, label: 'All', count: statusCounts.all, color: '' },
            {
              key: 'Pending' as const,
              label: 'Pending',
              count: statusCounts.pending,
              color: 'bg-[#19b8a5]',
            },
            {
              key: 'Approved' as const,
              label: 'Approved',
              count: statusCounts.approved,
              color: 'bg-[#19b8a5]',
            },
            {
              key: 'In Progress' as const,
              label: 'In Progress',
              count: statusCounts.inProgress,
              color: 'bg-[#19b8a5]',
            },
            {
              key: 'Reject' as const,
              label: 'Reject',
              count: statusCounts.reject,
              color: 'bg-destructive',
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setCardLimit(CARD_BATCH_SIZE);
                setPage(1);
              }}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all',
                statusFilter === tab.key
                  ? 'bg-[#ecfbf8] text-[#08766c] shadow-sm'
                  : 'text-[#647887] hover:bg-[#dff7f4] hover:text-[#08766c] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]',
              )}
            >
              {tab.color && <span className={cn('h-1.5 w-1.5 rounded-full', tab.color)} />}
              {tab.label}
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  statusFilter === tab.key
                    ? 'bg-[#dff7f4] text-[#08766c]'
                    : 'bg-[#f4f8fb] text-[#8aa0ad] dark:bg-[#071936] dark:text-[#8fb6cc]',
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <motion.div key="table-view" variants={itemVariants} initial="hidden" animate="visible">
          <div className="overflow-hidden rounded-2xl border bg-card">
            {isLoading ? (
              <div className="p-6">
                <SkeletonTable rows={8} cols={13} />
              </div>
            ) : paginated.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5edf2] bg-[#f4f8fb] dark:border-[#17383d] dark:bg-[#071936]">
                      <th className="w-10 px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        #
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Make
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Model
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Year
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Trim
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Scraped
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Requester
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Date
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-[#8aa0ad] dark:text-[#8fb6cc]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginated.map((req, i) => (
                      <tr
                        key={req.id}
                        className="group/row cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() => setSelectedRequest(req)}
                      >
                        <td className="px-3 py-3 text-sm text-muted-foreground">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ecfbf8]">
                              <Car className="h-3.5 w-3.5 text-[#19b8a5]" />
                            </div>
                            <span className="font-medium text-foreground">{req.make}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="text-foreground">{req.model}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">
                            {req.modelYear}
                          </span>
                        </td>
                        <td className="max-w-[140px] px-3 py-3">
                          <p className="truncate text-sm text-foreground" title={req.trim}>
                            {req.trim || '—'}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <ScrapeStatusBadge status={req.scrapeStatus} />
                            <ScrapedListingCount listings={req.scrapedListings} />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <p
                            className="max-w-[130px] truncate text-sm text-foreground"
                            title={req.contactName || req.contactEmail || ''}
                          >
                            {req.contactName || req.contactEmail || '—'}
                          </p>
                          {req.contactName &&
                            req.contactEmail &&
                            req.contactEmail !== req.contactName && (
                              <p className="max-w-[130px] truncate text-xs text-muted-foreground">
                                {req.contactEmail}
                              </p>
                            )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground">
                              {req.createdOn ? formatShortDate(req.createdOn) : '—'}
                            </span>
                            {req.createdOn && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(req.createdOn).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                            {(req.scrapeStatus === 'Pending' ||
                              req.scrapeStatus === 'Failed' ||
                              req.scrapeStatus === 'Unreachable' ||
                              !req.scrapeStatus) && (
                              <ScrapeNowButton
                                request={req}
                                size="icon-sm"
                                onComplete={(id) => {
                                  const updated = requests?.find((r) => r.id === id);
                                  if (updated) setSelectedRequest(updated);
                                }}
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="View details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(req);
                              }}
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
                  {search || statusFilter !== 'all'
                    ? 'No matching requests'
                    : 'No missing vehicle requests yet'}
                </p>
                <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
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
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                    }}
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
        <motion.div key="card-view" variants={itemVariants} initial="hidden" animate="visible">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: CARD_BATCH_SIZE }).map((_, i) => (
                <MissingVehicleCardSkeleton key={i} />
              ))}
            </div>
          ) : paginated.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((req) => (
                  <MissingVehicleCard
                    key={req.id}
                    request={req}
                    onClick={() => setSelectedRequest(req)}
                  />
                ))}
              </div>
              {hasMoreCards && (
                <div ref={cardLoadMoreRef} className="flex h-16 items-center justify-center">
                  <span className="text-xs font-medium text-[#8aa0ad] dark:text-[#8fb6cc]">
                    Loading more requests...
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border bg-card">
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50">
                  <SearchX className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  {search || statusFilter !== 'all'
                    ? 'No matching requests'
                    : 'No missing vehicle requests yet'}
                </p>
                <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
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
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                    }}
                    className="mt-4"
                  >
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
      {viewMode === 'table' && sorted.length > pageSize && (
        <motion.div variants={itemVariants}>
          <div className="flex flex-col items-center justify-between gap-3 rounded-[12px] bg-white/70 px-3 py-2 shadow-[0_8px_20px_rgba(18,38,63,0.04)] dark:bg-[#0c2530]/80 sm:flex-row">
            <p className="text-sm font-medium text-[#647887] dark:text-[#8fb6cc]">
              Page <span className="text-foreground">{page}</span> of{' '}
              <span className="text-foreground">{totalPages}</span>
              <span className="mx-2 text-muted-foreground/30">·</span>
              <span>{sorted.length} total</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 min-w-9 rounded-[10px] !bg-white !px-2 !text-[#647887] shadow-[0_6px_14px_rgba(18,38,63,0.05)] hover:!bg-[#dff7f4] hover:!text-[#08766c] disabled:!bg-transparent disabled:!text-[#9aabb5] disabled:shadow-none dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                title="First page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <ChevronLeft className="-ml-2 h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 min-w-9 rounded-[10px] !bg-white !px-2 !text-[#647887] shadow-[0_6px_14px_rgba(18,38,63,0.05)] hover:!bg-[#dff7f4] hover:!text-[#08766c] disabled:!bg-transparent disabled:!text-[#9aabb5] disabled:shadow-none dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) =>
                  pageNum === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-muted-foreground">
                      …
                    </span>
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
                  ),
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 min-w-9 rounded-[10px] !bg-white !px-2 !text-[#647887] shadow-[0_6px_14px_rgba(18,38,63,0.05)] hover:!bg-[#dff7f4] hover:!text-[#08766c] disabled:!bg-transparent disabled:!text-[#9aabb5] disabled:shadow-none dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 min-w-9 rounded-[10px] !bg-white !px-2 !text-[#647887] shadow-[0_6px_14px_rgba(18,38,63,0.05)] hover:!bg-[#dff7f4] hover:!text-[#08766c] disabled:!bg-transparent disabled:!text-[#9aabb5] disabled:shadow-none dark:!bg-[#0c2530] dark:!text-[#8fb6cc] dark:hover:!bg-[#0f3f43] dark:hover:!text-[#19b8a5]"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                title="Last page"
              >
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
