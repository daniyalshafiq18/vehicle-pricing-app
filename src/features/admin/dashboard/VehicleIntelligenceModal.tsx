import { useVehicle, usePricing, useComparableVehicles } from '@hooks';
import { useDashboardStore } from '@stores';
import { Dialog } from '@components/ui';
import { formatCurrency } from '@utils';
import {
  Info, Gauge, Cpu, Fuel, Cog, Shield, Layers, DollarSign,
  TrendingUp, TrendingDown, Minus, ArrowUpRight, Car,
} from 'lucide-react';

export function VehicleIntelligenceModal() {
  const selectedVehicleId = useDashboardStore((s) => s.selectedVehicleId);
  const isOpen = useDashboardStore((s) => s.isModalOpen);
  const closeModal = useDashboardStore((s) => s.closeModal);

  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(selectedVehicleId ?? undefined);
  const { data: pricing, isLoading: pricingLoading } = usePricing(selectedVehicleId ?? undefined);
  const { data: comparables } = useComparableVehicles(selectedVehicleId ?? undefined, 5);

  const isLoading = vehicleLoading || pricingLoading;

  if (!selectedVehicleId) return null;

  const trendColor = pricing?.marketTrend.direction === 'up' ? 'text-emerald-500'
    : pricing?.marketTrend.direction === 'down' ? 'text-rose-500' : 'text-muted-foreground';

  const TrendIcon = pricing?.marketTrend.direction === 'up' ? TrendingUp
    : pricing?.marketTrend.direction === 'down' ? TrendingDown : Minus;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={closeModal}
      title={isLoading ? 'Loading...' : `${vehicle?.year} ${vehicle?.make} ${vehicle?.model}`}
      description={vehicle?.spec || 'Vehicle Intelligence'}
      size="xl"
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-5">
        {isLoading ? (
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/50" />
              ))}
            </div>
          </div>
        ) : vehicle ? (
          <>
            {/* Vehicle Identity */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Car className="h-4 w-4" />
                Vehicle Identity
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Year', value: vehicle.year },
                  { label: 'Make', value: vehicle.make },
                  { label: 'Model', value: vehicle.model },
                  { label: 'Spec', value: vehicle.spec || '—' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border bg-card p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-0.5 font-medium text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            {pricing && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Pricing & Market Data
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Min Price', value: formatCurrency(pricing.minimumPrice || 0) },
                    { label: 'Average Price', value: formatCurrency(pricing.averagePrice) },
                    { label: 'Max Price', value: formatCurrency(pricing.maximumPrice || 0) },
                    { label: 'Median', value: formatCurrency(pricing.medianPrice || 0) },
                  ].map((p) => (
                    <div key={p.label} className="rounded-xl border bg-card p-3">
                      <p className="text-xs text-muted-foreground">{p.label}</p>
                      <p className="mt-0.5 font-semibold text-foreground">{p.value}</p>
                    </div>
                  ))}
                </div>

                {/* Range */}
                <div className="mt-3 rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(pricing.priceRange.min)}</span>
                    <span className="text-foreground/60">Price Range</span>
                    <span>{formatCurrency(pricing.priceRange.max)}</span>
                  </div>
                  <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40"
                      style={{
                        left: `${((pricing.priceRange.p25 - pricing.priceRange.min) / (pricing.priceRange.max - pricing.priceRange.min)) * 100}%`,
                        right: `${100 - ((pricing.priceRange.p75 - pricing.priceRange.min) / (pricing.priceRange.max - pricing.priceRange.min)) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute top-1/2 h-full w-0.5 -translate-y-1/2 rounded-full bg-foreground"
                      style={{
                        left: `${((pricing.averagePrice - pricing.priceRange.min) / (pricing.priceRange.max - pricing.priceRange.min)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Trend */}
                <div className="mt-3 flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5">
                  <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  <span className="text-xs text-muted-foreground">Market Trend:</span>
                  <span className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                    {pricing.marketTrend.direction === 'up' ? 'Appreciating'
                      : pricing.marketTrend.direction === 'down' ? 'Depreciating' : 'Stable'}
                    <span className="text-xs opacity-70">
                      ({pricing.marketTrend.percentage > 0 ? '+' : ''}{pricing.marketTrend.percentage}%)
                    </span>
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    Sample: {pricing.sampleSize} vehicles
                  </span>
                </div>
              </div>
            )}

            {/* Technical Specifications */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Technical Specifications
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Engine', value: `${vehicle.engineSize}L`, icon: Cpu },
                  { label: 'Horsepower', value: `${vehicle.horsepower} HP`, icon: Gauge },
                  { label: 'Cylinders', value: vehicle.cylinders, icon: Fuel },
                  { label: 'Transmission', value: vehicle.transmission, icon: Cog },
                  { label: 'Drive Type', value: vehicle.driveType, icon: Shield },
                  { label: 'Powertrain', value: vehicle.powertrain, icon: Layers },
                ].map((t) => (
                  <div key={t.label} className="rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-3">
                      <t.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{t.label}</p>
                        <p className="truncate font-medium text-foreground">{t.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Classification */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Info className="h-4 w-4" />
                Classification & Dimensions
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { label: 'Body Type', value: vehicle.bodyType },
                  { label: 'Category', value: vehicle.category },
                  { label: 'Vehicle Type', value: vehicle.vehicleType },
                  { label: 'Doors', value: vehicle.doors },
                  { label: 'Seats', value: vehicle.seats },
                ].map((d) => (
                  <div key={d.label} className="rounded-xl border bg-card p-3">
                    <p className="text-xs text-muted-foreground">{d.label}</p>
                    <p className="mt-0.5 font-medium text-foreground">{d.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {vehicle.description && (
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{vehicle.description}</p>
              </div>
            )}

            {/* Comparable Vehicles */}
            {comparables && comparables.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                  Comparable Vehicles
                </h4>
                <div className="space-y-2">
                  {comparables.map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border bg-card px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.vehicle.year} {c.vehicle.make} {c.vehicle.model}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{c.vehicle.spec} · {c.vehicle.bodyType}</p>
                      </div>
                      <div className="ml-4 text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(c.pricing.averagePrice)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.priceDifferencePercentage > 0 ? '+' : ''}{c.priceDifferencePercentage.toFixed(1)}% diff
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-foreground">Vehicle not found</p>
            <p className="mt-1 text-sm text-muted-foreground">The requested vehicle could not be loaded.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
