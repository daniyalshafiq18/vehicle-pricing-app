import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Database, ExternalLink, Loader, RefreshCw } from 'lucide-react';
import { Button, Input, Select } from '@components/ui';
import {
  usePromoteApprovedMissingVehicle,
  useSaveVehiclePricingDecision,
  useVehicleScrapeEvidence,
} from '@hooks';
import {
  MISSING_VEHICLE_PRICING_DECISION_METHOD,
  MISSING_VEHICLE_PRICING_DECISION_STATUS,
} from '@data/dataverseOptionSets';
import type {
  MissingVehiclePricingDecisionMethod,
  MissingVehiclePricingDecisionStatus,
  MissingVehicleRequest,
  VehicleScrapeRun,
  VehicleScrapeSourceResult,
} from '@types';
import { adminPricingDecisionStatus } from '@lib/vehicleScrapeRunState';
import { cn, formatCurrency } from '@utils';

function statusClass(status: string): string {
  if (status === 'Succeeded' || status === 'Completed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-300';
  }
  if (status === 'Failed' || status === 'Blocked' || status === 'No Data') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-300';
}

function value(fieldValue: string | number | null | undefined): string {
  return fieldValue === null || fieldValue === undefined || fieldValue === ''
    ? '—'
    : String(fieldValue);
}

function driveTypeLabel(driveType: string | undefined): string | undefined {
  const labels: Record<string, string> = {
    'https://schema.org/FrontWheelDriveConfiguration': 'FWD',
    'https://schema.org/RearWheelDriveConfiguration': 'RWD',
    'https://schema.org/AllWheelDriveConfiguration': 'AWD',
    'https://schema.org/FourWheelDriveConfiguration': '4WD',
  };
  return driveType ? (labels[driveType] ?? driveType) : undefined;
}

function SourceResultCard({ result }: { result: VehicleScrapeSourceResult }) {
  const specifications = [
    ['Trim', result.trim],
    ['Model Year', result.modelYear],
    ['Body Type', result.bodyType],
    ['Engine', result.engineSize ? `${result.engineSize} cc` : undefined],
    ['Cylinders', result.cylinders],
    ['Fuel', result.fuelType],
    ['Transmission', result.transmissionType],
    ['Drive Type', driveTypeLabel(result.driveType)],
    ['Horsepower', result.horsepower ? `${result.horsepower} hp` : undefined],
    ['Doors', result.doors],
  ] as const;

  return (
    <article className="min-w-0 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-foreground">{result.source}</h4>
          <p className="text-xs text-muted-foreground">
            {result.priceType ?? 'Price type unavailable'} · {result.transport}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs font-semibold',
            statusClass(result.processingStatus),
          )}
        >
          {result.processingStatus}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-xs text-muted-foreground">Minimum Price</p>
          <p className="mt-1 font-semibold tabular-nums text-foreground">
            {typeof result.minimumPrice === 'number' ? formatCurrency(result.minimumPrice) : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-xs text-muted-foreground">Maximum Price</p>
          <p className="mt-1 font-semibold tabular-nums text-foreground">
            {typeof result.maximumPrice === 'number' ? formatCurrency(result.maximumPrice) : '—'}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-muted-foreground">Listings</span>
          <p className="font-medium text-foreground">{value(result.listingCount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Attempt</span>
          <p className="font-medium text-foreground">{result.attemptNumber}</p>
        </div>
        {specifications.map(([label, fieldValue]) => (
          <div key={label} className="min-w-0">
            <span className="text-muted-foreground">{label}</span>
            <p className="break-words font-medium text-foreground">{value(fieldValue)}</p>
          </div>
        ))}
      </div>

      {result.errorMessage ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300">
          {result.errorMessage}
        </p>
      ) : null}

      {result.sourceUrl ? (
        <a
          href={result.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex max-w-full items-center gap-1.5 break-all text-xs font-medium text-[#08766c] hover:underline dark:text-[#5eead4]"
        >
          View source
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      ) : null}
    </article>
  );
}

const DECISION_STATUSES: MissingVehiclePricingDecisionStatus[] = [
  'Ready for Review',
  'Needs Attention',
  'Approved',
  'Rejected',
];

const DECISION_METHODS: MissingVehiclePricingDecisionMethod[] = [
  'Single Source',
  'Combined Sources',
  'Manual Override',
];

function sourceOptionLabel(result: VehicleScrapeSourceResult, includePrice: boolean): string {
  if (
    includePrice &&
    typeof result.minimumPrice === 'number' &&
    typeof result.maximumPrice === 'number'
  ) {
    return `${result.source} — ${formatCurrency(result.minimumPrice)} to ${formatCurrency(result.maximumPrice)}`;
  }
  return `${result.source} — ${result.trim ?? 'specifications unavailable'}`;
}

function PricingDecisionForm({
  request,
  run,
  results,
}: {
  request: MissingVehicleRequest;
  run: VehicleScrapeRun;
  results: VehicleScrapeSourceResult[];
}) {
  const saveDecision = useSaveVehiclePricingDecision();
  const succeeded = results.filter((result) => result.processingStatus === 'Succeeded');
  const priceResults = succeeded.filter(
    (result) =>
      typeof result.minimumPrice === 'number' && typeof result.maximumPrice === 'number',
  );
  const defaultPrimary =
    priceResults.find((result) => result.id === request.primaryPriceResultId) ?? priceResults[0];
  const defaultSpecifications =
    succeeded.find((result) => result.id === request.selectedSpecificationResultId) ??
    succeeded.find((result) => result.source === 'DriveArabia') ??
    succeeded[0];
  const [method, setMethod] = useState<MissingVehiclePricingDecisionMethod>(
    request.pricingDecisionMethod ?? 'Single Source',
  );
  const [status, setStatus] = useState<MissingVehiclePricingDecisionStatus>(
    adminPricingDecisionStatus(request.pricingDecisionStatus),
  );
  const [primaryResultId, setPrimaryResultId] = useState(
    request.primaryPriceResultId ?? defaultPrimary?.id ?? '',
  );
  const [specificationResultId, setSpecificationResultId] = useState(
    request.selectedSpecificationResultId ?? defaultSpecifications?.id ?? '',
  );
  const [minimumPrice, setMinimumPrice] = useState(
    String(request.approvedMinimumPrice ?? defaultPrimary?.minimumPrice ?? ''),
  );
  const [maximumPrice, setMaximumPrice] = useState(
    String(request.approvedMaximumPrice ?? defaultPrimary?.maximumPrice ?? ''),
  );
  const [notes, setNotes] = useState(request.decisionNotes ?? '');
  const [validationError, setValidationError] = useState<string>();
  const isTerminal = run.overallStatus !== 'Queued' && run.overallStatus !== 'Running';

  useEffect(() => {
    setMethod(request.pricingDecisionMethod ?? 'Single Source');
    setStatus(adminPricingDecisionStatus(request.pricingDecisionStatus));
    setPrimaryResultId(request.primaryPriceResultId ?? defaultPrimary?.id ?? '');
    setSpecificationResultId(
      request.selectedSpecificationResultId ?? defaultSpecifications?.id ?? '',
    );
    setMinimumPrice(String(request.approvedMinimumPrice ?? defaultPrimary?.minimumPrice ?? ''));
    setMaximumPrice(String(request.approvedMaximumPrice ?? defaultPrimary?.maximumPrice ?? ''));
    setNotes(request.decisionNotes ?? '');
    setValidationError(undefined);
  }, [request, run.id, defaultPrimary, defaultSpecifications]);

  const selectPrimaryResult = (resultId: string) => {
    setPrimaryResultId(resultId);
    const selected = priceResults.find((result) => result.id === resultId);
    if (selected) {
      setMinimumPrice(String(selected.minimumPrice));
      setMaximumPrice(String(selected.maximumPrice));
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(undefined);
    if (!isTerminal) {
      setValidationError('Complete or finish the active Scrape Run before reviewing prices.');
      return;
    }
    const minimum = Number(minimumPrice);
    const maximum = Number(maximumPrice);
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum <= 0) {
      setValidationError('Enter valid approved minimum and maximum prices.');
      return;
    }
    if (minimum > maximum) {
      setValidationError('Approved minimum price cannot exceed approved maximum price.');
      return;
    }
    const primaryResult = priceResults.find((result) => result.id === primaryResultId);
    if (method !== 'Manual Override' && !primaryResult) {
      setValidationError('Select a succeeded primary price result.');
      return;
    }
    const specificationResult = succeeded.find(
      (result) => result.id === specificationResultId,
    );
    if (!specificationResult) {
      setValidationError('Select a succeeded specification result.');
      return;
    }
    const trimmedNotes = notes.trim();
    if (
      !trimmedNotes &&
      (method === 'Manual Override' || status === 'Needs Attention' || status === 'Rejected')
    ) {
      setValidationError('Decision notes are required for this method or status.');
      return;
    }

    saveDecision.mutate({
      requestId: request.id,
      input: {
        approvedMinimumPrice: minimum,
        approvedMaximumPrice: maximum,
        pricingDecisionStatusValue: MISSING_VEHICLE_PRICING_DECISION_STATUS[status]!,
        pricingDecisionMethodValue: MISSING_VEHICLE_PRICING_DECISION_METHOD[method]!,
        reviewedScrapeRunId: run.id,
        primaryPriceResultId: method === 'Manual Override' ? null : primaryResult!.id,
        selectedSpecificationResultId: specificationResult.id,
        decisionNotes: trimmedNotes || null,
        decidedOn: status === 'Approved' || status === 'Rejected' ? new Date() : null,
      },
    });
  };

  if (!isTerminal) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-200">
        Pricing decision unlocks after the shared Scrape Run is no longer Queued or Running.
      </div>
    );
  }

  if (succeeded.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300">
        This Run has no succeeded source evidence available for a pricing decision.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-xl border bg-muted/15 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Pricing Decision</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Select the authoritative price and specification evidence. This does not promote the vehicle yet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Decision Method"
          value={method}
          onChange={(event) => setMethod(event.target.value as MissingVehiclePricingDecisionMethod)}
          options={DECISION_METHODS.map((item) => ({ value: item, label: item }))}
        />
        <Select
          label="Decision Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as MissingVehiclePricingDecisionStatus)}
          options={DECISION_STATUSES.map((item) => ({ value: item, label: item }))}
        />
        <Select
          label="Primary Price Result"
          value={method === 'Manual Override' ? '' : primaryResultId}
          disabled={method === 'Manual Override'}
          onChange={(event) => selectPrimaryResult(event.target.value)}
          placeholder="Select succeeded price evidence"
          options={priceResults.map((result) => ({
            value: result.id,
            label: sourceOptionLabel(result, true),
          }))}
        />
        <Select
          label="Specification Result"
          value={specificationResultId}
          onChange={(event) => setSpecificationResultId(event.target.value)}
          placeholder="Select succeeded specification evidence"
          options={succeeded.map((result) => ({
            value: result.id,
            label: sourceOptionLabel(result, false),
          }))}
        />
        <Input
          label="Approved Minimum Price"
          type="number"
          min="1"
          step="1"
          value={minimumPrice}
          onChange={(event) => setMinimumPrice(event.target.value)}
        />
        <Input
          label="Approved Maximum Price"
          type="number"
          min="1"
          step="1"
          value={maximumPrice}
          onChange={(event) => setMaximumPrice(event.target.value)}
        />
      </div>

      <label className="mt-4 block text-sm font-medium text-foreground">
        Decision Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="mt-2 w-full resize-y rounded-lg border border-[#d9e2e8] bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[#19b8a5]/60 focus:ring-2 focus:ring-[#19b8a5]/25 dark:border-[#31545a]"
          placeholder="Explain combined evidence, overrides, attention items, or rejection."
        />
      </label>

      {validationError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-300">{validationError}</p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={saveDecision.isPending}>
          {saveDecision.isPending ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Save decision
        </Button>
      </div>
    </form>
  );
}

function VehiclePromotionAction({ request }: { request: MissingVehicleRequest }) {
  const promotion = usePromoteApprovedMissingVehicle();
  const isPromoted = request.status === 'Approved' || Boolean(request.promotedVehicleId);
  const isDecisionApproved = request.pricingDecisionStatus === 'Approved';

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-400/30 dark:bg-emerald-950/25">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Vehicle Data Promotion</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Uses the approved price range and selected specification evidence. Promotion is
            checked again against Dataverse before any master record is created.
          </p>
        </div>
        <Button
          type="button"
          disabled={!isDecisionApproved || isPromoted || promotion.isPending}
          onClick={() => promotion.mutate(request.id)}
        >
          {promotion.isPending ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          {isPromoted ? 'Already in Vehicle Data' : 'Push to Vehicle Data'}
        </Button>
      </div>
      {!isDecisionApproved && !isPromoted ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Save the pricing decision as Approved before promotion.
        </p>
      ) : null}
    </div>
  );
}

export function VehicleScrapeEvidencePanel({ request }: { request: MissingVehicleRequest }) {
  const evidence = useVehicleScrapeEvidence(request.id);

  if (evidence.isLoading) {
    return (
      <div className="mt-5 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        <Loader className="mr-2 inline h-4 w-4 animate-spin" />
        Loading source evidence…
      </div>
    );
  }

  if (evidence.isError) {
    return (
      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-400/30 dark:bg-red-950/40">
        <p className="text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          Source evidence could not be loaded.
        </p>
        <Button variant="outline" size="sm" onClick={() => evidence.refetch()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!evidence.data) {
    return (
      <div className="mt-5 rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        No normalized source evidence has been recorded for this request yet.
      </div>
    );
  }

  const { run, results } = evidence.data;
  return (
    <section className="mt-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Source Evidence</h3>
        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', statusClass(run.overallStatus))}>
          {run.overallStatus}
        </span>
        <span className="text-xs text-muted-foreground">
          {run.successfulSourceCount ?? 0}/{run.requestedSourceCount ?? results.length} succeeded
        </span>
      </div>
      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {results.map((result) => (
            <SourceResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          This Run has no Source Results.
        </div>
      )}
      <PricingDecisionForm request={request} run={run} results={results} />
      <VehiclePromotionAction request={request} />
    </section>
  );
}
