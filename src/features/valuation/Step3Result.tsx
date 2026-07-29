import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInquiryStore } from '@stores';
import { useValuation, useSaveInquiry, useUpsertMissingVehicleRequest } from '@hooks';
import { useVehicleStore } from '@stores';
import type { Inquiry } from '@types';
import { Button, Card, CardContent, Badge, Skeleton } from '@components/ui';
import { motion } from 'framer-motion';
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
  Heart,
} from 'lucide-react';
import { formatCurrency, downloadValuationPdf } from '@utils';

export function Step3Result() {
  const [searchParams] = useSearchParams();
  const debugForceNotFound = searchParams.get('test') === 'notfound';

  const { personalInfo, vehicleSelection, prevStep, reset } = useInquiryStore();
  const { valuationResult, setValuationResult } = useVehicleStore();
  const saveInquiry = useSaveInquiry();
  const upsertRequest = useUpsertMissingVehicleRequest();
  const inquirySaved = useRef(false);

  const [requestSubmitted, setRequestSubmitted] = useState(false);

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

  /** Submit a missing vehicle request (no scraping — that's handled by admin). */
  const handleSubmitRequest = useCallback(async () => {
    try {
      await upsertRequest.mutateAsync({
        make: vehicleSelection.make,
        model: vehicleSelection.model,
        trim: vehicleSelection.spec,
        modelYear: vehicleSelection.year ?? 0,
        contactEmail: personalInfo.email || undefined,
        contactName: personalInfo.firstName && personalInfo.lastName
          ? `${personalInfo.firstName} ${personalInfo.lastName}`
          : personalInfo.firstName || undefined,
      });
      setRequestSubmitted(true);
    } catch {
      // MVR creation failed — toast will show from the hook
    }
  }, [vehicleSelection, personalInfo, upsertRequest]);

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

  // ── Vehicle Not Found or Submitted ───────────────────────────
  if (isNotFound || requestSubmitted) {
    return (
      <div className="mx-auto max-w-lg">
        {requestSubmitted ? (
          /* ── Success State ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <Heart className="h-10 w-10 text-success" />
            </div>
            <h2 className="mb-2 text-lg font-bold tracking-tight">Request Submitted!</h2>
            <p className="mb-6 text-muted-foreground">
              We've received your request for the{' '}
              <span className="font-semibold text-foreground">
                {vehicleSelection.year} {vehicleSelection.make} {vehicleSelection.model}
              </span>
              . Our team will review it and get back to you at{' '}
              <span className="font-semibold text-foreground">
                {personalInfo.email || 'your email'}
              </span>
              .
            </p>
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
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#ecfbf8] dark:bg-[#0f3f43]">
              <SearchX className="h-10 w-10 text-[#19b8a5]" />
            </div>
            <h2 className="mb-2 text-lg font-bold tracking-tight">Vehicle Not Found</h2>
            <p className="mb-1 text-muted-foreground">
              We couldn't find this vehicle in our valuation database yet.
            </p>
            <p className="mb-8 text-sm text-muted-foreground/70">
              We're continuously expanding our UAE vehicle catalogue.
            </p>

            {/* Summary card */}
            <Card className="mb-8 border-[#bfe9e2] bg-[#ecfbf8] dark:border-[#31545a] dark:bg-[#0f3f43]">
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-3 text-left">
                  {[
                    { label: 'Make', value: vehicleSelection.make },
                    { label: 'Model', value: vehicleSelection.model },
                    { label: 'Year', value: vehicleSelection.year },
                    { label: 'Spec', value: vehicleSelection.spec },
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
              onClick={handleSubmitRequest}
              disabled={upsertRequest.isPending}
              className="mb-3 w-full"
            >
              {upsertRequest.isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Request This Vehicle
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground/60">
              We'll review your request and follow up with market data.
            </p>

            <div className="mt-6">
              <Button variant="outline" size="lg" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try Another Vehicle
              </Button>
            </div>
          </motion.div>
        )}
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
        <h2 className="mb-2 text-lg font-semibold">Valuation Unavailable</h2>
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
          <h2 className="text-lg font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-muted-foreground">{vehicle.spec}</p>
        </div>
      </div>

      {/* Price Range */}
      <Card className="border-[#bfe9e2] bg-[#ecfbf8] dark:border-[#31545a] dark:bg-[#0f3f43]">
        <CardContent className="p-6 text-center">
          <p className="mb-1 text-sm text-muted-foreground">Market Price Range</p>
          <p className="text-3xl font-bold text-[#08766c] dark:text-[#19b8a5]">
            {formatCurrency(pricing.minimumPrice)} — {formatCurrency(pricing.maximumPrice)}
          </p>
        </CardContent>
      </Card>

      {/* Vehicle Specs */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Car className="h-5 w-5 text-[#19b8a5]" />
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
                  className="rounded-xl bg-[#f4f8fb] p-4 transition-colors hover:bg-[#ecfbf8] dark:bg-[#071936] dark:hover:bg-[#0f3f43]"
                >
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <p className="text-sm">{spec.label}</p>
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
              <TrendingUp className="h-5 w-5 text-[#19b8a5]" />
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
                        ? 'bg-success/10 text-success'
                        : insight.severity === 'negative'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-[#ecfbf8] text-[#08766c] dark:bg-[#0f3f43] dark:text-[#19b8a5]'
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
            onClick={() => {
              downloadValuationPdf({ vehicle, pricing });
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
    </motion.div>
  );
}
