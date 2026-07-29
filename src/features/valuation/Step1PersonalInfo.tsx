import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInquiryStore } from '@stores';
import { Button, Input } from '@components/ui';
import { inquiryFormSchema, cn } from '@utils';
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
  const [cityTouched, setCityTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inquiryFormSchema),
    mode: 'onTouched',
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

  // Mark all custom fields as touched before submit to surface inline errors
  const handleSubmitClick = () => {
    setCityTouched(true);
    setPhoneTouched(true);
  };

  return (
    <div className="mx-auto max-w-2xl text-[#071936] dark:text-white">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-semibold text-[#071936] dark:text-white sm:text-3xl">Personal Information</h1>
        <p className="mt-2 text-[#647887] dark:text-[#b8cbd4]">
          Enter your details to receive the complete valuation report.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        {/* Personal Details */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wider text-slate-800 dark:text-slate-200">Personal Details</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              label="First Name"
              placeholder="John"
              className="h-12"
              required
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              className="h-12"
              required
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
        </section>

        {/* Contact Details */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wider text-slate-800 dark:text-slate-200">Contact Details</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              className="h-12"
              required
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#071936] dark:text-white">
                Phone
                <span className="ml-0.5 text-red-500">*</span>
              </label>
              <div className={cn(
                'flex h-12 overflow-hidden rounded-xl border shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-[#19b8a5]/25',
                errors.phone
                  ? 'border-destructive focus-within:ring-destructive'
                  : phoneTouched && !phoneValue
                    ? 'border-red-300 focus-within:ring-red-500'
                    : 'border-[#d9e2e8] focus-within:border-[#19b8a5]/60',
              )}>
                <div className="flex shrink-0 items-center bg-muted/30 px-4 text-sm font-semibold text-foreground">
                  +971
                </div>
                <input
                  type="tel"
                  placeholder="50 123 4567"
                  required
                  className="h-full w-full bg-transparent px-4 text-sm text-[#071936] outline-none placeholder:text-[#8fa3ad] dark:text-white dark:placeholder:text-[#6f8d99]"
                  value={phoneSuffix}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setValue('phone', digits ? `+971${digits}` : '', { shouldValidate: true });
                  }}
                  onBlur={() => {
                    setPhoneTouched(true);
                    setValue('phone', watch('phone'), { shouldValidate: true });
                  }}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
              {!errors.phone && phoneTouched && !phoneValue && (
                <p className="text-xs text-destructive">Phone is required</p>
              )}
            </div>
          </div>
        </section>

        {/* Location */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wider text-slate-800 dark:text-slate-200">Location</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#071936] dark:text-white">
                Country
                <span className="ml-0.5 text-red-500">*</span>
              </label>
              <input type="hidden" value="United Arab Emirates" {...register('country')} />
              <div className="flex h-12 items-center gap-2.5 rounded-xl border border-[#d9e2e8] bg-muted/30 px-4 text-sm text-muted-foreground dark:border-[#31545a]">
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
              <label className="text-sm font-medium text-[#071936] dark:text-white">
                City
                <span className="ml-0.5 text-red-500">*</span>
              </label>
              <div className="relative" ref={cityRef}>
                <button
                  type="button"
                  onClick={() => { setCityOpen(!cityOpen); setCityTouched(true); }}
                  onBlur={() => setCityTouched(true)}
                  className={cn(
                    'flex h-12 w-full cursor-pointer items-center rounded-xl border bg-background px-4 text-sm text-[#071936] shadow-sm transition-all duration-200 hover:border-[#19b8a5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19b8a5]/25 dark:text-white',
                    errors.city
                      ? 'border-destructive focus-visible:ring-destructive'
                      : cityTouched && !selectedCity
                        ? 'border-red-300 focus-visible:ring-red-500'
                        : 'border-[#d9e2e8] dark:border-[#31545a]',
                  )}
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
                  <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-[#d9e2e8] bg-background shadow-xl shadow-black/5 dark:border-[#31545a]">
                    {cities.map((c) => {
                      const isSelected = selectedCity === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setValue('city', c, { shouldValidate: true });
                            setCityOpen(false);
                            setCityTouched(true);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            isSelected
                              ? 'bg-[#ecfbf8] text-[#08766c] font-medium dark:bg-[#0f3f43] dark:text-[#19b8a5]'
                              : 'text-foreground hover:bg-[#dff7f4] hover:text-[#08766c] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]'
                          }`}
                        >
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? 'bg-[#19b8a5]' : 'bg-transparent'}`} />
                          {c}
                          {isSelected && (
                            <span className="ml-auto text-xs text-[#08766c] dark:text-[#19b8a5]">Selected</span>
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
              {!errors.city && cityTouched && !selectedCity && (
                <p className="text-xs text-destructive">City is required</p>
              )}
            </div>
          </div>
        </section>

        {/* Consent */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wider text-slate-800 dark:text-slate-200">Agreement</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-[#d9e2e8] bg-muted/10 p-5 transition-colors hover:border-[#19b8a5]/35 hover:bg-[#ecfbf8]/60 has-[:checked]:border-[#19b8a5]/40 has-[:checked]:bg-[#ecfbf8] dark:border-[#31545a] dark:hover:bg-[#0f3f43] dark:has-[:checked]:bg-[#0f3f43]">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 rounded border-[#d9e2e8] text-[#19b8a5] focus:ring-[#19b8a5]"
              {...register('consent')}
            />
            <div className="flex-1 text-sm leading-relaxed text-[#647887] dark:text-[#b8cbd4]">
              I consent to the processing of my personal data for the purpose of vehicle valuation and agree to the terms of service.
            </div>
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/30" />
          </label>
          {errors.consent && (
            <p className="mt-2 text-xs text-destructive">{errors.consent.message}</p>
          )}
        </section>

        <div className="flex justify-center pt-2">
          <Button type="submit" variant="gradient" size="xl" loading={isSubmitting} onClick={handleSubmitClick}>
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
