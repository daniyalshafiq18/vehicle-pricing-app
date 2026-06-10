import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInquiryStore } from '@stores';
import { Button, Input } from '@components/ui';
import { inquiryFormSchema } from '@utils';
import { ArrowRight, ChevronDown, MapPin, ShieldCheck } from 'lucide-react';

const cities = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
  'Al Ain',
];

export function Step1PersonalInfo() {
  const { personalInfo, setPersonalInfo, nextStep } = useInquiryStore();

  const [cityOpen, setCityOpen] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: { ...personalInfo, country: 'United Arab Emirates' },
  });

  const phoneValue = watch('phone');
  const phoneSuffix = phoneValue?.replace('+971', '') ?? '';
  const selectedCity = watch('city');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSubmit = (data: typeof personalInfo) => {
    setPersonalInfo({ ...data, country: 'United Arab Emirates' });
    nextStep();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Personal Information</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your details to receive the complete valuation report.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        {/* Personal Details */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Personal Details</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              label="First Name"
              placeholder="John"
              className="h-12"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              className="h-12"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
        </section>

        {/* Contact Details */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Contact Details</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              className="h-12"
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <div className="flex h-12 overflow-hidden rounded-xl border border-input shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring has-[:invalid]:ring-destructive">
                <div className="flex shrink-0 items-center bg-muted/30 px-4 text-sm font-semibold text-foreground">
                  +971
                </div>
                <input
                  type="tel"
                  placeholder="50 123 4567"
                  className="h-full w-full bg-transparent px-4 text-sm outline-none"
                  value={phoneSuffix}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setValue('phone', digits ? `+971${digits}` : '', { shouldValidate: true });
                  }}
                  onBlur={() => setValue('phone', watch('phone'), { shouldValidate: true })}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Location */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Location</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <input type="hidden" value="United Arab Emirates" {...register('country')} />
              <div className="flex h-12 items-center gap-2.5 rounded-xl border border-input bg-muted/30 px-4 text-sm text-muted-foreground">
                <span className="flex items-center text-lg leading-none">
                  <svg viewBox="0 0 24 16" className="h-4 w-6 rounded-sm shadow-sm">
                    <rect x="0" y="0" width="24" height="16" fill="#fff" />
                    <rect x="0" y="0" width="6" height="16" fill="#FF0000" />
                    <rect x="6" y="0" width="18" height="5.33" fill="#009E00" />
                    <rect x="6" y="10.67" width="18" height="5.33" fill="#000" />
                  </svg>
                </span>
                <span>United Arab Emirates</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <div className="relative" ref={cityRef}>
                <button
                  type="button"
                  onClick={() => setCityOpen(!cityOpen)}
                  className="flex h-12 w-full items-center rounded-xl border border-input bg-background px-4 text-sm shadow-sm transition-all duration-200 hover:border-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  {selectedCity ? (
                    <span className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCity}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select your city</span>
                  )}
                  <div className="ml-auto rounded-md bg-muted/40 p-1 text-muted-foreground">
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" style={{ transform: cityOpen ? 'rotate(180deg)' : undefined }} />
                  </div>
                </button>

                {cityOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border/50 bg-background shadow-xl shadow-black/5">
                    {cities.map((c) => {
                      const isSelected = selectedCity === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setValue('city', c, { shouldValidate: true });
                            setCityOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary/5 text-primary font-medium'
                              : 'text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? 'bg-primary' : 'bg-transparent'}`} />
                          {c}
                          {isSelected && (
                            <span className="ml-auto text-xs text-primary">Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Consent */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Agreement</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-border/40 bg-muted/10 p-5 transition-colors hover:bg-muted/20 has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 rounded border-input text-primary focus:ring-primary"
              {...register('consent')}
            />
            <div className="flex-1 text-sm leading-relaxed text-muted-foreground">
              I consent to the processing of my personal data for the purpose of vehicle valuation and agree to the terms of service.
            </div>
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/30" />
          </label>
          {errors.consent && (
            <p className="mt-2 text-xs text-destructive">{errors.consent.message}</p>
          )}
        </section>

        <div className="flex justify-center pt-2">
          <Button type="submit" variant="gradient" size="xl" loading={isSubmitting}>
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
