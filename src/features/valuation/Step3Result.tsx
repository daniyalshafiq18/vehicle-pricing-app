import { useEffect, useRef } from 'react';
import { useInquiryStore } from '@stores';
import { useValuation, useSaveInquiry } from '@hooks';
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
} from 'lucide-react';
import { formatCurrency } from '@utils';

export function Step3Result() {
  const { personalInfo, vehicleSelection, prevStep, reset } = useInquiryStore();
  const { valuationResult, setValuationResult } = useVehicleStore();
  const saveInquiry = useSaveInquiry();
  const inquirySaved = useRef(false);

  const { data: valuation, isLoading, error, isFetched } = useValuation(
    vehicleSelection.year,
    vehicleSelection.make,
    vehicleSelection.model,
    vehicleSelection.spec,
    vehicleSelection.bodyType,
  );

  useEffect(() => {
    if (valuation) setValuationResult(valuation);
  }, [valuation, setValuationResult]);

  // ── Single-fire save guard ────────────────────────────────────
  // Prevents duplicate saves using useRef (immune to re-renders)
  // and synchronous lock acquisition before the async mutate() call.
  useEffect(() => {
    if (!valuation || !isFetched) return;
    if (inquirySaved.current) return;

    // Acquire lock (synchronous — immune to race)
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

  if (isLoading) {
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
    </motion.div>
  );
}
