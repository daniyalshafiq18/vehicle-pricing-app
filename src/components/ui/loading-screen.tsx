import { cn } from '@utils';
import { Car } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  className?: string;
  /** 0–100. When provided the bar is determinate; omit for indeterminate. */
  progress?: number;
}

/**
 * LoadingScreen — Premium full-screen loading overlay.
 *
 * Features a glowing purple→orange gradient progress bar, animated
 * scanning rings, ambient glow orbs, and the brand car icon.
 *
 * Pass `progress` (0–100) for a determinate bar with a live percentage;
 * omit it to keep the current indeterminate animation.
 */
export function LoadingScreen({
  message = 'Loading...',
  className,
  progress,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background',
        className,
      )}
    >
      {/* Technical grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Ambient glow orbs — purple + orange */}
      <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/3 h-48 w-48 rounded-full bg-fuchsia-500/6 blur-3xl" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Car icon with rotating rings */}
        <div className="relative flex items-center justify-center">
          {/* Outer scanning ring — purple */}
          <div
            className="absolute h-28 w-28 animate-spin rounded-full border-2"
            style={{
              animationDuration: '3s',
              borderColor: 'transparent',
              borderTopColor: '#8B5CF6',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.4))',
            }}
          />
          {/* Middle scanning ring — orange */}
          <div
            className="absolute h-24 w-24 animate-spin rounded-full border"
            style={{
              animationDuration: '2s',
              animationDirection: 'reverse',
              borderColor: 'transparent',
              borderTopColor: '#F97316',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              filter: 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.3))',
            }}
          />
          {/* Inner glow ring */}
          <div
            className="absolute h-20 w-20 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(249,115,22,0.05) 50%, transparent 70%)',
            }}
          />

          {/* Car icon */}
          <div className="animate-bounce-gentle">
            <Car className="h-16 w-16 text-violet-600 drop-shadow-[0_0_20px_rgba(139,92,246,0.35)] dark:text-violet-400" />
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

        {/* Progress bar — determinate when progress is given, else indeterminate */}
        <div className="w-72 space-y-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
            <div
              className="absolute inset-0 h-full rounded-full transition-all duration-500 ease-out"
              style={
                progress !== undefined
                  ? {
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                      background:
                        'linear-gradient(90deg, #8B5CF6 0%, #A855F7 30%, #F97316 70%, #F59E0B 100%)',
                      boxShadow:
                        '0 0 12px rgba(139, 92, 246, 0.4), 0 0 24px rgba(249, 115, 22, 0.2)',
                    }
                  : {
                      background:
                        'linear-gradient(90deg, #8B5CF6 0%, #A855F7 30%, #F97316 70%, #F59E0B 100%)',
                      animation: 'indeterminate-bar 1.8s ease-in-out infinite',
                      width: '40%',
                      boxShadow:
                        '0 0 12px rgba(139, 92, 246, 0.4), 0 0 24px rgba(249, 115, 22, 0.2)',
                    }
              }
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            {progress !== undefined ? (
              <>
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: progress >= 100 ? '#22C55E' : '#8B5CF6',
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  {message}{' '}
                  <span className="font-medium tabular-nums text-foreground/80">
                    {Math.min(100, Math.max(0, progress))}%
                  </span>
                </p>
              </>
            ) : (
              <>
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: '#8B5CF6' }}
                />
                <p className="text-sm text-muted-foreground">{message}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
