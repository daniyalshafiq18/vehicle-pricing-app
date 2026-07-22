import { cn } from '@utils';
import { Car } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  className?: string;
  /** 0–100. When provided the bar is determinate. */
  progress?: number;
}

export function LoadingScreen({ message = 'Loading...', className, progress }: LoadingScreenProps) {
  const displayProgress = progress ?? 0;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background',
        className,
      )}
    >
      {/* Technical grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 h-56 w-56 rounded-full bg-accent/8 blur-3xl" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Car icon with rotating ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer scanning ring */}
          <div
            className="absolute h-28 w-28 rounded-full border-2 border-primary/20"
            style={{
              animation: 'spin 3s linear infinite',
              borderTopColor: 'hsl(var(--primary))',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            }}
          />
          <div
            className="absolute h-24 w-24 rounded-full border border-primary/10"
            style={{
              animation: 'spin 2s linear infinite reverse',
              borderTopColor: 'hsl(var(--accent))',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            }}
          />

          {/* Car icon */}
          <div className="animate-bounce-gentle">
            <Car className="h-16 w-16 text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.35)]" />
          </div>
        </div>

        {/* Brand title with tagline */}
        <div className="space-y-1 text-center">
          <p className="text-lg font-bold tracking-tight text-foreground">
            Vehicle Pricing Intelligence Platform
          </p>
          <p className="text-xs tracking-widest text-muted-foreground/60 uppercase">
            UAE Market Analysis
          </p>
        </div>

        {/* Progress bar with percentage */}
        <div className="w-72 space-y-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-75 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{message}</p>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {Math.round(displayProgress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
