import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInquiryStore } from '@stores';
import { useValuation, useSaveInquiry, useUpsertMissingVehicleRequest, useUpsertPriceSuggestion } from '@hooks';
import { useVehicleStore } from '@stores';
import type { Inquiry } from '@types';
import { Button, Card, CardContent, Badge, Skeleton, Dialog } from '@components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Car,
  Gauge,
  Cpu,
  Cog,
  Shield,
  BarChart3,
  Users,
  Layers,
  DoorOpen,
  Zap,
  Tag,
  SearchX,
  Send,
  DollarSign,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Loader2,
  Globe,
} from 'lucide-react';
import { cn, formatCurrency } from '@utils';
import { scrapeYallaMotor, type ScrapeResult } from '@lib/yallaMotorScraper';
import { updateMissingVehicleRequest } from '@lib/missingVehicleApi';

export function Step3Result() {
  const [searchParams] = useSearchParams();
  const debugForceNotFound = searchParams.get('test') === 'notfound';

  const { personalInfo, vehicleSelection, prevStep, reset } = useInquiryStore();
  const { valuationResult, setValuationResult } = useVehicleStore();
  const saveInquiry = useSaveInquiry();
  const upsertRequest = useUpsertMissingVehicleRequest();
  const upsertSuggestion = useUpsertPriceSuggestion();
  const inquirySaved = useRef(false);

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  /** Dialog phase: 'form' → 'scraping' → 'results' */
  const [dialogPhase, setDialogPhase] = useState<'form' | 'scraping' | 'results'>('form');
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  /** ID of the MVR created during step 1, used to patch correction prices. */
  const [mvrCreatedId, setMvrCreatedId] = useState<string | null>(null);

  /** Price correction (step 2 inside dialog) */
  const [correctionMinPrice, setCorrectionMinPrice] = useState('');
  const [correctionMaxPrice, setCorrectionMaxPrice] = useState('');
  const [correctionSourceUrl, setCorrectionSourceUrl] = useState('');

  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [suggestMinPrice, setSuggestMinPrice] = useState('');
  const [suggestMaxPrice, setSuggestMaxPrice] = useState('');
  const [suggestSourceUrl, setSuggestSourceUrl] = useState('');
  const [suggestComment, setSuggestComment] = useState('');
  const [requestCylinders, setRequestCylinders] = useState('');
  const [requestFuelType, setRequestFuelType] = useState('');
  const [requestTransmissionType, setRequestTransmissionType] = useState('');
  const [requestDriveType, setRequestDriveType] = useState('');
  const [requestMinMileage, setRequestMinMileage] = useState('');
  const [requestMaxMileage, setRequestMaxMileage] = useState('');

  const { data: valuation, isLoading, error, isFetched } = useValuation(
    vehicleSelection.year,
    vehicleSelection.make,
    vehicleSelection.model,
    vehicleSelection.spec,
    vehicleSelection.bodyType,
  );

  const isNotFound = debugForceNotFound || (isFetched && !valuation && !isLoading && !error);

  useEffect(() => {
    if (valuation) setValuationResult(valuation);
  }, [valuation, setValuationResult]);

  // ── Single-fire save guard ────────────────────────────────────
  useEffect(() => {
    if (!valuation || !isFetched) return;
    if (inquirySaved.current) return;

    inquirySaved.current = true;

    const inquiry: Inquiry = {
      id: crypto.randomUUID(),
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      email: personalInfo.email,
      phone: personalInfo.phone,
      country: personalInfo.country,
      city: personalInfo.city,
      consent: personalInfo.consent,
      selectedVehicle: {
        year: vehicleSelection.year ?? 0,
        make: vehicleSelection.make,
        model: vehicleSelection.model,
        spec: vehicleSelection.spec,
        bodyType: vehicleSelection.bodyType,
      },
      valuationResult: valuation,
      createdAt: new Date(),
      status: 'pending',
    };
    saveInquiry.mutate(inquiry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuation, isFetched]);

  const handleSubmitRequest = useCallback(async () => {
    setDialogPhase('scraping');
    setScrapeError(null);

    try {
      // 1. Scrape YallaMotor first to get the estimated prices
      const result = await scrapeYallaMotor({
        make: vehicleSelection.make,
        model: vehicleSelection.model,
        spec: vehicleSelection.spec,
        year: vehicleSelection.year ?? new Date().getFullYear(),
        bodyType: vehicleSelection.bodyType || undefined,
        cylinders: requestCylinders || undefined,
        fuelType: requestFuelType || undefined,
        transmissionType: requestTransmissionType || undefined,
        driveType: requestDriveType || undefined,
      });
      setScrapeResult(result);

      // 2. Create the MVR with scraped prices included
      const mvrId = await upsertRequest.mutateAsync({
        make: vehicleSelection.make,
        model: vehicleSelection.model,
        bodyType: vehicleSelection.bodyType,
        trim: vehicleSelection.spec,
        modelYear: vehicleSelection.year ?? 0,
        cylinders: requestCylinders || undefined,
        fuelType: requestFuelType || undefined,
        transmissionType: requestTransmissionType || undefined,
        driveType: requestDriveType || undefined,
        contactEmail: personalInfo.email || undefined,
        contactName: personalInfo.firstName && personalInfo.lastName
          ? `${personalInfo.firstName} ${personalInfo.lastName}`
          : personalInfo.firstName || undefined,
        minPrice: result.estimatedMinPrice,
        maxPrice: result.estimatedMaxPrice,
        minMileage: requestMinMileage ? Number(requestMinMileage) : undefined,
        maxMileage: requestMaxMileage ? Number(requestMaxMileage) : undefined,
      });
      setMvrCreatedId(mvrId);

      setDialogPhase('results');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process request';
      setScrapeError(message);
      setDialogPhase('results');
    }
  }, [
    vehicleSelection, requestCylinders, requestFuelType,
    requestTransmissionType, requestDriveType, requestMinMileage,
    requestMaxMileage, personalInfo, upsertRequest,
  ]);

  /** Submit the user's price correction from the scraped-results step. */
  const handleSubmitCorrection = useCallback(async () => {
    const hasPrices = correctionMinPrice || correctionMaxPrice;

    // If there's a valid MVR ID and prices to correct, PATCH them to Dataverse
    if (mvrCreatedId && hasPrices) {
      try {
        await updateMissingVehicleRequest(mvrCreatedId, {
          minPrice: correctionMinPrice ? Number(correctionMinPrice) : undefined,
          maxPrice: correctionMaxPrice ? Number(correctionMaxPrice) : undefined,
        });
      } catch {
        // Correction PATCH failed — still show success to the user.
        // The admin can correct prices manually.
      }
    }

    setShowRequestDialog(false);
    setRequestSubmitted(true);
  }, [correctionMinPrice, correctionMaxPrice, correctionSourceUrl, mvrCreatedId]);

  const handleSubmitSuggestion = () => {
    const vehicleId = valuationResult?.vehicle.id;
    if (!vehicleId) return;

    upsertSuggestion.mutate(
      {
        vehicleId,
        minPrice: suggestMinPrice ? Number(suggestMinPrice) : undefined,
        maxPrice: suggestMaxPrice ? Number(suggestMaxPrice) : undefined,
        sourceUrl: suggestSourceUrl || undefined,
        comment: suggestComment || undefined,
        submittedBy: personalInfo.email || personalInfo.firstName || undefined,
      },
      {
        onSuccess: () => {
          setShowSuggestDialog(false);
          setSuggestMinPrice('');
          setSuggestMaxPrice('');
          setSuggestSourceUrl('');
          setSuggestComment('');
        },
      },
    );
  };

  // ── Loading ──────────────────────────────────────────────────
  // (skip loading in debug mode so we see the not-found UI immediately)
  if (isLoading && !debugForceNotFound) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ── Vehicle Not Found ────────────────────────────────────────
  if (isNotFound || requestSubmitted) {
    return (
      <div className="mx-auto max-w-lg">
        <AnimatePresence mode="wait">
          {requestSubmitted ? (
            /* ── Success State ── */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
                <MessageSquare className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight">Request Submitted!</h2>
              <p className="mb-2 text-muted-foreground">
                We'll send you a message on{' '}
                <span className="font-semibold text-foreground">
                  {personalInfo.email || 'your email'}
                </span>{' '}
                once this vehicle is available.
              </p>
              {/* Show scraped result summary if available */}
              {scrapeResult && (
                <div className="mx-auto mt-4 mb-6 max-w-xs rounded-xl border bg-card p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Scraped Market Price
                  </p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {formatCurrency(scrapeResult.estimatedMinPrice)} — {formatCurrency(scrapeResult.estimatedMaxPrice)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Based on {scrapeResult.listingsCount} listings
                  </p>
                </div>
              )}
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" size="lg" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button variant="gradient" size="lg" onClick={reset}>
                  New Valuation
                </Button>
              </div>
            </motion.div>
          ) : (
            /* ── Vehicle Not Found ── */
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
                <SearchX className="h-10 w-10 text-amber-500" />
              </div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight">Vehicle Not Found</h2>
              <p className="mb-1 text-muted-foreground">
                We couldn't find this vehicle in our valuation database yet.
              </p>
              <p className="mb-8 text-sm text-muted-foreground/70">
                We're continuously expanding our UAE vehicle catalogue.
              </p>

              {/* Summary card */}
              <Card className="mb-8 border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {[
                      { label: 'Make', value: vehicleSelection.make },
                      { label: 'Model', value: vehicleSelection.model },
                      { label: 'Year', value: vehicleSelection.year },
                      { label: 'Spec', value: vehicleSelection.spec },
                      { label: 'Body Type', value: vehicleSelection.bodyType },
                    ].filter((item) => item.value).map((item) => (
                      <div key={item.label} className="rounded-lg bg-background/60 px-3 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="text-sm font-semibold text-foreground">{String(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="gradient"
                size="lg"
                onClick={() => setShowRequestDialog(true)}
                className="mb-3 w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                Request This Vehicle
              </Button>
              <p className="text-xs text-muted-foreground/60">
                Most requested vehicles are added first.
              </p>

              <div className="mt-6">
                <Button variant="outline" size="lg" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Try Another Vehicle
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Multi-Step Request Dialog ── */}
        <Dialog
          isOpen={showRequestDialog}
          onClose={() => {
            if (dialogPhase === 'scraping') return; // block close while scraping
            setShowRequestDialog(false);
            setDialogPhase('form');
          }}
          title=""
          description=""
          size="md"
          hideCloseButton
        >
          {/* Step indicator */}
          <div className="flex items-center gap-2 px-6 pt-5 pb-3">
            {[
              { phase: 'form', label: 'Details', icon: Car },
              { phase: 'scraping', label: 'Scrape', icon: Globe },
              { phase: 'results', label: 'Results', icon: Sparkles },
            ].map((step, i) => {
              const Icon = step.icon;
              const isActive = dialogPhase === step.phase || (dialogPhase === 'results' && step.phase === 'results') || (dialogPhase === 'scraping' && step.phase === 'scraping') || (dialogPhase === 'results' && (step.phase === 'form' || step.phase === 'scraping'));
              const isPast = (dialogPhase === 'scraping' && step.phase === 'form') ||
                (dialogPhase === 'results' && step.phase !== 'results');
              return (
                <div key={step.phase} className="flex items-center gap-2">
                  {i > 0 && <div className={cn('h-px w-6', isPast ? 'bg-primary/40' : 'bg-border')} />}
                  <div className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isPast ? 'bg-primary/10 text-primary' :
                    isActive ? 'bg-primary/10 text-primary' :
                    'text-muted-foreground bg-muted/30',
                  )}>
                    <Icon className="h-3 w-3" />
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Phase 1: Form ── */}
          {dialogPhase === 'form' && (
            <div className="space-y-5 px-6 pb-6">
              {/* Prefilled summary */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Make', value: vehicleSelection.make },
                    { label: 'Model', value: vehicleSelection.model },
                    { label: 'Year', value: vehicleSelection.year },
                    { label: 'Body Type', value: vehicleSelection.bodyType },
                    { label: 'Spec', value: vehicleSelection.spec },
                  ]
                    .filter((item) => item.value)
                    .map((item) => (
                      <div key={item.label}>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="text-sm font-semibold text-foreground">{String(item.value)}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Additional details */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Additional Details
                </p>
                <div className="grid grid-cols-4 gap-3">
                  <select
                    value={requestCylinders}
                    onChange={(e) => setRequestCylinders(e.target.value)}
                    className="h-9 rounded-lg border bg-background px-3 text-xs outline-none focus:border-primary/50"
                  >
                    <option value="">Cylinders</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="16">16</option>
                  </select>
                  <select
                    value={requestFuelType}
                    onChange={(e) => setRequestFuelType(e.target.value)}
                    className="h-9 rounded-lg border bg-background px-3 text-xs outline-none focus:border-primary/50"
                  >
                    <option value="">Fuel Type</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Petrol/Diesel">Petrol/Diesel</option>
                  </select>
                  <select
                    value={requestTransmissionType}
                    onChange={(e) => setRequestTransmissionType(e.target.value)}
                    className="h-9 rounded-lg border bg-background px-3 text-xs outline-none focus:border-primary/50"
                  >
                    <option value="">Transmission</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT</option>
                  </select>
                  <select
                    value={requestDriveType}
                    onChange={(e) => setRequestDriveType(e.target.value)}
                    className="h-9 rounded-lg border bg-background px-3 text-xs outline-none focus:border-primary/50"
                  >
                    <option value="">Drive Type</option>
                    <option value="4X4">4X4</option>
                    <option value="AWD">AWD</option>
                    <option value="FWD">FWD</option>
                    <option value="RWD">RWD</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Mileage range */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mileage Range (km)
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={requestMinMileage}
                    onChange={(e) => setRequestMinMileage(e.target.value)}
                    className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
                  />
                  <span className="text-muted-foreground/40">—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={requestMaxMileage}
                    onChange={(e) => setRequestMaxMileage(e.target.value)}
                    className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleSubmitRequest}
                  disabled={upsertRequest.isPending}
                  className="flex-1"
                >
                  {upsertRequest.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Request &amp; Scrape
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Phase 2: Scraping ── */}
          {dialogPhase === 'scraping' && (
            <div className="flex flex-col items-center justify-center px-6 pb-8 pt-4">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground">Scraping Listings</p>
              <p className="mt-1.5 text-center text-sm text-muted-foreground max-w-xs">
                Searching YallaMotor, Dubizzle, and other UAE marketplaces for{' '}
                {vehicleSelection.year} {vehicleSelection.make} {vehicleSelection.model}...
              </p>
            </div>
          )}

          {/* ── Phase 3: Results ── */}
          {dialogPhase === 'results' && (
            <div className="space-y-5 px-6 pb-6">
              {scrapeError && !scrapeResult ? (
                /* Error state */
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-center">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {scrapeError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDialogPhase('form');
                      setScrapeError(null);
                    }}
                    className="mt-3"
                  >
                    Try Again
                  </Button>
                </div>
              ) : scrapeResult ? (
                <>
                  {/* Scraped Price Estimate */}
                  <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-5 text-center">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Scraped Market Price
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(scrapeResult.estimatedMinPrice)} — {formatCurrency(scrapeResult.estimatedMaxPrice)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {scrapeResult.currency} · Based on {scrapeResult.listingsCount} listings
                    </p>
                    {/* Mini listings list */}
                    <div className="mt-4 max-h-24 space-y-1.5 overflow-y-auto">
                      {scrapeResult.listings.slice(0, 5).map((listing, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-1.5 text-xs">
                          <span className="text-muted-foreground truncate">
                            {listing.source} · {listing.mileage.toLocaleString()} km
                          </span>
                          <span className="ml-2 font-semibold text-foreground">
                            {formatCurrency(listing.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Correction */}
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-amber-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Not satisfied with the estimate?
                      </p>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Enter your own suggested price range for this vehicle.
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="number"
                        placeholder="Min Price"
                        value={correctionMinPrice}
                        onChange={(e) => setCorrectionMinPrice(e.target.value)}
                        className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
                      />
                      <span className="text-muted-foreground/40">—</span>
                      <input
                        type="number"
                        placeholder="Max Price"
                        value={correctionMaxPrice}
                        onChange={(e) => setCorrectionMaxPrice(e.target.value)}
                        className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
                      />
                    </div>
                    <div className="relative">
                      <ExternalLink className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                      <input
                        type="url"
                        placeholder="Source URL (optional)"
                        value={correctionSourceUrl}
                        onChange={(e) => setCorrectionSourceUrl(e.target.value)}
                        className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRequestDialog(false);
                        setRequestSubmitted(true);
                      }}
                      className="flex-1"
                    >
                      Skip
                    </Button>
                    <Button
                      variant="gradient"
                      onClick={handleSubmitCorrection}
                      disabled={upsertSuggestion.isPending || (!correctionMinPrice && !correctionMaxPrice)}
                      className="flex-1"
                    >
                      {upsertSuggestion.isPending ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Submit Price
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </Dialog>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error || !valuationResult) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <BarChart3 className="mx-auto h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold">Valuation Unavailable</h2>
        <p className="mb-6 text-muted-foreground">
          We couldn't generate a valuation for the selected vehicle. Please try a different
          selection.
        </p>
        <Button onClick={prevStep} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  // ── Valuation ────────────────────────────────────────────────
  const { vehicle, pricing, marketInsights } = valuationResult;

  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-muted-foreground">{vehicle.spec}</p>
        </div>
      </div>

      {/* Price Range */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <p className="mb-1 text-sm text-muted-foreground">Market Price Range</p>
          <p className="text-3xl font-bold text-primary">
            {formatCurrency(pricing.minimumPrice)} — {formatCurrency(pricing.maximumPrice)}
          </p>
        </CardContent>
      </Card>

      {/* Vehicle Specs */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Car className="h-5 w-5 text-primary" />
            Vehicle Specifications
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: 'Engine', value: `${vehicle.engineSize}L`, icon: Cpu },
              { label: 'Horsepower', value: `${vehicle.horsepower} HP`, icon: Gauge },
              { label: 'Cylinders', value: `${vehicle.cylinders}`, icon: Layers },
              { label: 'Transmission', value: vehicle.transmission, icon: Cog },
              { label: 'Drive Type', value: vehicle.driveType, icon: Shield },
              { label: 'Body Type', value: vehicle.bodyType, icon: Car },
              { label: 'Doors', value: `${vehicle.doors}`, icon: DoorOpen },
              { label: 'Seats', value: `${vehicle.seats}`, icon: Users },
              { label: 'Powertrain', value: vehicle.powertrain, icon: Zap },
              { label: 'Category', value: vehicle.category, icon: Tag },
            ].map((spec) => {
              const Icon = spec.icon;
              return (
                <div
                  key={spec.label}
                  className="rounded-xl bg-muted/40 p-4 transition-colors hover:bg-muted/60"
                >
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <p className="text-xs">{spec.label}</p>
                  </div>
                  <p className="text-sm font-semibold">{spec.value}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Market Insights */}
      {marketInsights.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-primary" />
              Market Insights
            </h3>
            <div className="space-y-3">
              {marketInsights.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border bg-card p-4"
                >
                  <div
                    className={`mt-0.5 rounded-full p-1 ${
                      insight.severity === 'positive'
                        ? 'bg-green-500/10 text-green-500'
                        : insight.severity === 'negative'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {insight.severity === 'positive' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : insight.severity === 'negative' ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{insight.title}</p>
                      {insight.value && (
                        <Badge variant="secondary" size="sm">
                          {insight.value}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" size="lg" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowSuggestDialog(true)}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Suggest Price
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.print();
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="gradient" onClick={reset}>
            New Valuation
          </Button>
        </div>
      </div>

      {/* ── Suggest Price Dialog ── */}
      <Dialog
        isOpen={showSuggestDialog}
        onClose={() => setShowSuggestDialog(false)}
        title="Suggest Market Price"
        description="Share your knowledge about this vehicle's market value."
        size="md"
      >
        <div className="space-y-5">
          {/* Reference vehicle */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Vehicle
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {vehicle.year} {vehicle.make} {vehicle.model} — {vehicle.spec}
            </p>
          </div>

          {/* Price inputs */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suggested Price Range
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Min Price"
                value={suggestMinPrice}
                onChange={(e) => setSuggestMinPrice(e.target.value)}
                className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
              />
              <span className="text-muted-foreground/40">—</span>
              <input
                type="number"
                placeholder="Max Price"
                value={suggestMaxPrice}
                onChange={(e) => setSuggestMaxPrice(e.target.value)}
                className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Source URL */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Source URL <span className="text-muted-foreground/50">(optional)</span>
            </p>
            <div className="relative">
              <ExternalLink className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="url"
                placeholder="https://example.com/listing"
                value={suggestSourceUrl}
                onChange={(e) => setSuggestSourceUrl(e.target.value)}
                className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comment <span className="text-muted-foreground/50">(optional)</span>
            </p>
            <textarea
              placeholder="Why do you think this price range is accurate?"
              value={suggestComment}
              onChange={(e) => setSuggestComment(e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowSuggestDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSubmitSuggestion}
              disabled={upsertSuggestion.isPending || (!suggestMinPrice && !suggestMaxPrice)}
              className="flex-1"
            >
              {upsertSuggestion.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Submitting...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Submit Suggestion
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </motion.div>
  );
}
