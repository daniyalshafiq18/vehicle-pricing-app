import { useEffect, useMemo } from 'react';
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
  LayoutGrid,
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

function bodyTypesForVehicle(
  hierarchy: { bodyTypes: Record<string, string[]> },
  year: number,
  make: string,
  model: string,
  spec: string,
): string[] {
  const key = `${year}-${make.toLowerCase()}-${model.toLowerCase()}-${spec.toLowerCase()}`;
  return hierarchy.bodyTypes[key] ?? [];
}

// ── cascade step definitions ────────────────────────────────────────

const CASCADE_STEPS = ['Make', 'Model', 'Spec', 'Year', 'Body Type'] as const;

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
  // All unique body types across the entire hierarchy (fallback for missing-vehicle free-text)
  const allBodyTypesFromDB = useMemo(
    () =>
      hierarchy
        ? [...new Set(Object.values(hierarchy.bodyTypes).flat())].sort()
        : [],
    [hierarchy],
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

  // Body types: cascade-filter when the full combo exists in DB,
  // otherwise show all body types from the database
  const allBodyTypes = useMemo(
    () => {
      if (!hierarchy) return [];
      if (vehicleSelection.year && vehicleSelection.make && vehicleSelection.model && vehicleSelection.spec) {
        const matched = bodyTypesForVehicle(
          hierarchy,
          vehicleSelection.year,
          vehicleSelection.make,
          vehicleSelection.model,
          vehicleSelection.spec,
        );
        if (matched.length > 0) return matched; // combo found in DB → cascade filter
      }
      return allBodyTypesFromDB; // combo not found → show all body types
    },
    [hierarchy, vehicleSelection.year, vehicleSelection.make, vehicleSelection.model, vehicleSelection.spec, allBodyTypesFromDB],
  );

  // auto-populate body type when only one option
  useEffect(() => {
    if (allBodyTypes.length === 1 && vehicleSelection.bodyType !== allBodyTypes[0]) {
      setVehicleSelection({ bodyType: allBodyTypes[0] });
    }
  }, [allBodyTypes, vehicleSelection.bodyType, setVehicleSelection]);

  const canProceed = !!(
    vehicleSelection.make &&
    vehicleSelection.model &&
    vehicleSelection.spec &&
    vehicleSelection.year &&
    vehicleSelection.bodyType
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canProceed) nextStep();
  };

  // ── render ─────────────────────────────────────────────────────────

  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Overlay spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
              <div
                className="absolute h-20 w-20 animate-spin rounded-full border-2 border-primary/20"
                style={{
                  borderTopColor: 'hsl(var(--primary))',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                  borderLeftColor: 'transparent',
                }}
              />
              <div
                className="absolute h-14 w-14 animate-spin rounded-full border border-primary/10"
                style={{
                  animationDirection: 'reverse',
                  borderTopColor: 'hsl(var(--accent))',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                  borderLeftColor: 'transparent',
                }}
              />
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <h1 className="text-3xl font-bold tracking-tight">
            Vehicle Selection
          </h1>
          <p className="mt-2 text-muted-foreground">
            Select your vehicle details to get an accurate market valuation.
          </p>
        </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Cascade visual indicator */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
          {CASCADE_STEPS.map((step, i) => {
            let active = false;
            if (step === 'Make') active = !!vehicleSelection.make;
            else if (step === 'Model') active = !!vehicleSelection.model;
            else if (step === 'Spec') active = !!vehicleSelection.spec;
            else if (step === 'Year') active = !!vehicleSelection.year;
            else if (step === 'Body Type') active = !!vehicleSelection.bodyType;

            return (
              <div key={step} className="flex items-center gap-1.5">
                {i > 0 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground/40'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Vehicle Details section */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
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
              onChange={(v) =>
                setVehicleSelection({
                  make: v,
                  model: '',
                  spec: '',
                  year: null,
                  bodyType: '',
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
              onChange={(v) =>
                setVehicleSelection({
                  model: v,
                  spec: '',
                  year: null,
                  bodyType: '',
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
              onChange={(v) =>
                setVehicleSelection({ spec: v, year: null, bodyType: '' })
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
              onChange={(v) => {
                setVehicleSelection({ year: Number(v), bodyType: '' });
              }}
            />

            {/* Body Type */}
            <VehicleSelect
              label="Body Type"
              icon={LayoutGrid}
              value={vehicleSelection.bodyType}
              placeholder={
                allBodyTypes.length === 0
                  ? 'Type a body type'
                  : 'Select or type a body type'
              }
              options={allBodyTypes.map((bt) => ({
                value: bt,
                label: bt,
              }))}
              onChange={(v) => setVehicleSelection({ bodyType: v })}
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
