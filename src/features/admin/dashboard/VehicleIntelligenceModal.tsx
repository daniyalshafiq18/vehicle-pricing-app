import { useVehicle, usePricing } from '@hooks';
import { useDashboardStore } from '@stores';
import { Dialog } from '@components/ui';
import { formatCurrency } from '@utils';
import {
  Info,
  Gauge,
  Cpu,
  Fuel,
  Cog,
  Shield,
  Layers,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Car,
} from 'lucide-react';

const statCardClass = 'rounded-[8px] border-0 bg-white p-3 shadow-[0_8px_20px_rgba(18,38,63,0.05)] dark:bg-[#071936] dark:shadow-none';
const sectionTitleClass = 'mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[#647887] dark:text-[#b8cbd4]';
const labelClass = 'text-xs font-medium text-[#7e95a3] dark:text-[#b8cbd4]';
const valueClass = 'mt-0.5 font-semibold text-[#071936] dark:text-white';

export function VehicleIntelligenceModal() {
  const selectedVehicleId = useDashboardStore((s) => s.selectedVehicleId);
  const isOpen = useDashboardStore((s) => s.isModalOpen);
  const closeModal = useDashboardStore((s) => s.closeModal);

  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(selectedVehicleId ?? undefined);
  const { data: pricing, isLoading: pricingLoading } = usePricing(selectedVehicleId ?? undefined);

  const isLoading = vehicleLoading || pricingLoading;

  if (!selectedVehicleId) {
    return null;
  }

  const trendColor = pricing?.marketTrend.direction === 'up'
    ? 'text-[#19b8a5]'
    : pricing?.marketTrend.direction === 'down'
      ? 'text-[#8fb6cc]'
      : 'text-[#b8cbd4]';

  const TrendIcon = pricing?.marketTrend.direction === 'up'
    ? TrendingUp
    : pricing?.marketTrend.direction === 'down'
      ? TrendingDown
      : Minus;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={closeModal}
      title={isLoading ? 'Loading...' : `${vehicle?.year} ${vehicle?.make} ${vehicle?.model}`}
      description={vehicle?.spec || 'Vehicle Intelligence'}
      size="xl"
      className="border-0 bg-[#f3f7fa] text-[#071936] shadow-[0_24px_60px_rgba(7,25,54,0.18)] dark:bg-[#0c2530] dark:text-white dark:shadow-none"
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-6 w-48 rounded-[8px] bg-white/80 dark:bg-[#071936]" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-[8px] bg-white/70 dark:bg-[#071936]" />
              ))}
            </div>
          </div>
        ) : vehicle ? (
          <>
            <div>
              <h4 className={sectionTitleClass}>
                <Car className="h-4 w-4 text-[#19b8a5]" />
                Vehicle Identity
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Year', value: vehicle.year },
                  { label: 'Make', value: vehicle.make },
                  { label: 'Model', value: vehicle.model },
                  { label: 'Spec', value: vehicle.spec || '-' },
                ].map((s) => (
                  <div key={s.label} className={statCardClass}>
                    <p className={labelClass}>{s.label}</p>
                    <p className={valueClass}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {pricing && (
              <div>
                <h4 className={sectionTitleClass}>
                  <DollarSign className="h-4 w-4 text-[#19b8a5]" />
                  Pricing & Market Data
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Min Price', value: formatCurrency(pricing.minimumPrice || 0) },
                    { label: 'Average Price', value: formatCurrency(pricing.averagePrice) },
                    { label: 'Max Price', value: formatCurrency(pricing.maximumPrice || 0) },
                    { label: 'Median', value: formatCurrency(pricing.medianPrice || 0) },
                  ].map((p) => (
                    <div key={p.label} className={statCardClass}>
                      <p className={labelClass}>{p.label}</p>
                      <p className={valueClass}>{p.value}</p>
                    </div>
                  ))}
                </div>

                <div className={`${statCardClass} mt-3 flex items-center gap-2 px-4 py-2.5`}>
                  <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  <span className="text-xs font-medium text-[#647887] dark:text-[#b8cbd4]">Market Trend:</span>
                  <span className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
                    {pricing.marketTrend.direction === 'up'
                      ? 'Appreciating'
                      : pricing.marketTrend.direction === 'down'
                        ? 'Depreciating'
                        : 'Stable'}
                    <span className="text-xs opacity-80">
                      ({pricing.marketTrend.percentage > 0 ? '+' : ''}{pricing.marketTrend.percentage}%)
                    </span>
                  </span>
                  <span className="ml-auto text-xs font-medium text-[#7e95a3] dark:text-[#b8cbd4]">
                    Sample: {pricing.sampleSize} vehicles
                  </span>
                </div>
              </div>
            )}

            <div>
              <h4 className={sectionTitleClass}>
                <Gauge className="h-4 w-4 text-[#19b8a5]" />
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
                  <div key={t.label} className={statCardClass}>
                    <div className="flex items-center gap-3">
                      <t.icon className="h-5 w-5 shrink-0 text-[#8fb6cc] dark:text-[#19b8a5]" />
                      <div className="min-w-0">
                        <p className={labelClass}>{t.label}</p>
                        <p className="truncate font-semibold text-[#071936] dark:text-white">{t.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className={sectionTitleClass}>
                <Info className="h-4 w-4 text-[#19b8a5]" />
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
                  <div key={d.label} className={statCardClass}>
                    <p className={labelClass}>{d.label}</p>
                    <p className={valueClass}>{d.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {vehicle.description && (
              <div>
                <h4 className={sectionTitleClass}>
                  <Info className="h-4 w-4 text-[#19b8a5]" />
                  Description
                </h4>
                <p className="text-sm leading-relaxed text-[#4f6775] dark:text-[#d8e7ef]">{vehicle.description}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-semibold text-[#071936] dark:text-white">Vehicle not found</p>
            <p className="mt-1 text-sm font-medium text-[#8aa0ad] dark:text-[#b8cbd4]">The requested vehicle could not be loaded.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
