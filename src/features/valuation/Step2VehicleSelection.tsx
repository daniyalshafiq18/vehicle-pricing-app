import { useMemo } from 'react';
import { useInquiryStore } from '@stores';
import { Button } from '@components/ui';
import { useVehicleHierarchy } from '@hooks';
import { VehicleSelect } from './components/VehicleSelect';
import { cn } from '@utils';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Tag,
  SlidersHorizontal,
  Calendar,
  Loader2,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────

function allMakes(hierarchy: { makes: Record<number, string[]> }): string[] {
  return [...new Set(Object.values(hierarchy.makes).flat())].sort();
}

function modelsForMake(hierarchy: { models: Record<string, string[]> }, make: string): string[] {
  const key = make.toLowerCase();
  return [
    ...new Set(
      Object.entries(hierarchy.models)
        .filter(([modelKey]) => modelKey.endsWith(`-${key}`))
        .flatMap(([, models]) => models),
    ),
  ].sort();
}

function specsForMakeModel(
  hierarchy: { specs: Record<string, string[]> },
  make: string,
  model: string,
): string[] {
  const key = `${make.toLowerCase()}-${model.toLowerCase()}`;
  return [
    ...new Set(
      Object.entries(hierarchy.specs)
        .filter(([specKey]) => specKey.endsWith(`-${key}`))
        .flatMap(([, specs]) => specs),
    ),
  ].sort();
}

function yearsForMakeModelSpec(
  hierarchy: { years: number[]; specs: Record<string, string[]> },
  make: string,
  model: string,
  spec: string,
): number[] {
  const suffix = `-${make.toLowerCase()}-${model.toLowerCase()}`;
  return hierarchy.years.filter((year) =>
    hierarchy.specs[`${year}${suffix}`]?.includes(spec),
  );
}

// ── cascade step definitions ────────────────────────────────────────
// (removed — fields are now directly selectable in any order)

// ── main component ──────────────────────────────────────────────────

export function Step2VehicleSelection() {
  const { vehicleSelection, setVehicleSelection, prevStep, nextStep } =
    useInquiryStore();
  const { data: hierarchy, isLoading } = useVehicleHierarchy();

  const makes = useMemo(
    () => (hierarchy ? allMakes(hierarchy) : []),
    [hierarchy],
  );
  const models = useMemo(
    () =>
      hierarchy && vehicleSelection.make
        ? modelsForMake(hierarchy, vehicleSelection.make)
        : [],
    [hierarchy, vehicleSelection.make],
  );
  const specs = useMemo(
    () =>
      hierarchy && vehicleSelection.make && vehicleSelection.model
        ? specsForMakeModel(hierarchy, vehicleSelection.make, vehicleSelection.model)
        : [],
    [hierarchy, vehicleSelection.make, vehicleSelection.model],
  );
  // Years: cascade-filter when make/model/spec combo exists in DB,
  // otherwise show all years (free-text entry for missing vehicles)
  const years = useMemo(
    () => {
      if (!hierarchy) return [];
      if (vehicleSelection.make && vehicleSelection.model && vehicleSelection.spec) {
        const matched = yearsForMakeModelSpec(
          hierarchy,
          vehicleSelection.make,
          vehicleSelection.model,
          vehicleSelection.spec,
        );
        if (matched.length > 0) return matched; // combo found in DB → cascade filter
      }
      // combo not found or not fully selected → show all years
      return hierarchy.years ?? [];
    },
    [hierarchy, vehicleSelection.make, vehicleSelection.model, vehicleSelection.spec],
  );

  const canProceed = !!(
    vehicleSelection.make &&
    vehicleSelection.model &&
    vehicleSelection.spec &&
    vehicleSelection.year
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canProceed) nextStep();
  };

  // ── render ─────────────────────────────────────────────────────────

  return (
    <div className="relative mx-auto max-w-2xl text-[#071936] dark:text-white">
      {/* Overlay spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
              <div
                className="absolute h-20 w-20 animate-spin rounded-full border-2 border-[#19b8a5]/20"
                style={{
                  borderTopColor: '#19b8a5',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                  borderLeftColor: 'transparent',
                }}
              />
              <div
                className="absolute h-14 w-14 animate-spin rounded-full border border-[#8fb6cc]/25"
                style={{
                  animationDirection: 'reverse',
                  borderTopColor: '#8fb6cc',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                  borderLeftColor: 'transparent',
                }}
              />
              <Loader2 className="h-8 w-8 animate-spin text-[#19b8a5]" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm font-semibold text-foreground">Loading vehicle data</p>
              <p className="text-xs text-muted-foreground">Fetching makes, models &amp; specifications</p>
            </div>
          </div>
        </div>
      )}

      <div className={cn(isLoading && 'pointer-events-none select-none', 'transition-opacity duration-300', isLoading && 'opacity-40')}>
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-[#071936] dark:text-white sm:text-3xl">
            Vehicle Selection
          </h1>
          <p className="mt-2 text-[#647887] dark:text-[#b8cbd4]">
            Select your vehicle details to get an accurate market valuation.
          </p>
        </div>

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* Vehicle Details section */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wider text-slate-800 dark:text-slate-200">
              Vehicle Details
            </h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="space-y-5">
            {/* Make */}
            <VehicleSelect
              label="Make"
              icon={Car}
              value={vehicleSelection.make}
              placeholder="Select make"
              options={makes.map((m) => ({ value: m, label: m }))}
              required
              onChange={(v) =>
                setVehicleSelection({
                  make: v,
                  model: '',
                  spec: '',
                  year: null,
                })
              }
            />

            {/* Model */}
            <VehicleSelect
              label="Model"
              icon={Tag}
              value={vehicleSelection.model}
              placeholder="Select or type a model"
              options={models.map((m) => ({ value: m, label: m }))}
              required
              onChange={(v) =>
                setVehicleSelection({
                  model: v,
                  spec: '',
                  year: null,
                })
              }
            />

            {/* Spec */}
            <VehicleSelect
              label="Specification"
              icon={SlidersHorizontal}
              value={vehicleSelection.spec}
              placeholder="Select or type a spec"
              options={specs.map((s) => ({ value: s, label: s }))}
              required
              onChange={(v) =>
                setVehicleSelection({ spec: v, year: null })
              }
            />

            {/* Year */}
            <VehicleSelect
              label="Year"
              icon={Calendar}
              value={vehicleSelection.year ?? ''}
              placeholder="Select or type a year"
              options={years.map((y) => ({
                value: String(y),
                label: String(y),
              }))}
              required
              onChange={(v) => {
                setVehicleSelection({ year: Number(v) });
              }}
            />
          </div>
        </section>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" size="lg" onClick={prevStep}>
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            disabled={!canProceed}
          >
            Get Valuation
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
