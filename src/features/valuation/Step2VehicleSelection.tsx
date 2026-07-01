import { useState, useRef, useEffect, useMemo } from 'react';
import { useInquiryStore } from '@stores';
import { Button, Skeleton } from '@components/ui';
import { useVehicleHierarchy } from '@hooks';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Tag,
  SlidersHorizontal,
  Calendar,
  LayoutGrid,
  ChevronDown,
  Check,
  Search,
  X,
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

// ── searchable select sub-component ─────────────────────────────────

interface VehicleSelectProps {
  label: string;
  icon: React.ElementType;
  value: string | number;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

function VehicleSelect({
  label,
  icon: Icon,
  value,
  placeholder,
  options,
  disabled = false,
  onChange,
}: VehicleSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // auto-focus the search input when dropdown opens
  useEffect(() => {
    if (open) {
      // small delay so the input is rendered before focus
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setSearchQuery('');
    }
  }, [open]);

  const displayValue =
    options.find((o) => String(o.value) === String(value))?.label ?? '';
  const isSelected =
    value !== '' && value !== null && value !== undefined;

  // filter options by search query (case-insensitive)
  const filteredOptions = useMemo(
    () =>
      searchQuery
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : options,
    [options, searchQuery],
  );

  return (
    <div className="space-y-2" ref={ref}>
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={`flex h-12 w-full items-center gap-3 rounded-xl border px-4 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            disabled
              ? 'border-input/50 bg-muted/20 text-muted-foreground/50 cursor-not-allowed'
              : 'border-input bg-background hover:border-muted-foreground/30 cursor-pointer'
          }`}
        >
          <Icon
            className={`h-4 w-4 shrink-0 ${
              disabled ? 'text-muted-foreground/30' : 'text-muted-foreground'
            }`}
          />
          {isSelected ? (
            <span
              className={
                disabled ? 'text-muted-foreground/50' : 'text-foreground'
              }
            >
              {displayValue}
            </span>
          ) : (
            <span className="text-muted-foreground/60">{placeholder}</span>
          )}
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
              disabled ? 'text-muted-foreground/20' : 'text-muted-foreground'
            }`}
            style={{
              transform: open && !disabled ? 'rotate(180deg)' : undefined,
            }}
          />
        </button>

        {open && !disabled && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-border/50 bg-background shadow-xl shadow-black/5">
            {/* Search input */}
            <div className="relative border-b border-border/40">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full border-0 bg-transparent py-3 pl-10 pr-9 text-sm outline-none placeholder:text-muted-foreground/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Options list */}
            <div className="max-h-52 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const selected = String(opt.value) === String(value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        selected
                          ? 'bg-primary/5 text-primary font-medium'
                          : 'text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          selected ? 'bg-primary' : 'bg-transparent'
                        }`}
                      />
                      <span className="flex-1 truncate">{opt.label}</span>
                      {selected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })
              ) : searchQuery ? (
                <div className="border-b border-border/40 px-4 py-6 text-center text-sm text-muted-foreground/60">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground/60">
                  Type to enter a custom value
                </div>
              )}
              {/* Allow custom typed value when no exact match exists */}
              {searchQuery &&
                !options.some(
                  (o) =>
                    o.label.toLowerCase() === searchQuery.toLowerCase(),
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchQuery);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 border-t border-primary/10 bg-primary/[0.03] px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5">
                      <span className="text-[10px] font-bold text-primary">+</span>
                    </div>
                    <span>
                      Use "<span className="font-semibold">{searchQuery}</span>"
                    </span>
                  </button>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const years = useMemo(
    () =>
      hierarchy && vehicleSelection.make && vehicleSelection.model && vehicleSelection.spec
        ? yearsForMakeModelSpec(
            hierarchy,
            vehicleSelection.make,
            vehicleSelection.model,
            vehicleSelection.spec,
          )
        : hierarchy?.years ?? [],
    [hierarchy, vehicleSelection.make, vehicleSelection.model, vehicleSelection.spec],
  );

  const allBodyTypes = useMemo(
    () =>
      hierarchy && vehicleSelection.year && vehicleSelection.make && vehicleSelection.model && vehicleSelection.spec
        ? bodyTypesForVehicle(
            hierarchy,
            vehicleSelection.year,
            vehicleSelection.make,
            vehicleSelection.model,
            vehicleSelection.spec,
          )
        : [],
    [hierarchy, vehicleSelection.year, vehicleSelection.make, vehicleSelection.model, vehicleSelection.spec],
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

  // ── loading state ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
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
  );
}
