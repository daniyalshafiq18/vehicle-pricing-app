import { useEffect, useRef, useState } from 'react';
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
 *
 * When determinate, the displayed percentage eases smoothly toward the
 * real progress value so the bar never jumps abruptly. A persistent
 * rAF loop crawls at a constant speed, decoupling the visual from
 * discrete API-call jumps (each one returns 5000 records at once).
 */
export function LoadingScreen({
  message = 'Loading...',
  className,
  progress,
}: LoadingScreenProps) {
  // Smooth animation: displayed value crawls at a CONSTANT fixed rate
  // toward the real progress target. This decouples the visual from the
  // discrete API‑call jumps.
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(progress);

  // Keep the ref in sync without triggering re-renders or effect restarts
  targetRef.current = progress;

  useEffect(() => {
    // Reset if we switch from determinate → indeterminate
    if (progress === undefined) {
      setDisplayed(0);
    }
  }, [progress === undefined]);

  // Persistent rAF loop — runs once on mount, stops on unmount.
  // NEVER restarts when `progress` changes.
  useEffect(() => {
    let running = true;
    const STEP = 0.35; // % per frame at 60fps ≈ 21%/second
    const animate = () => {
      if (!running) return;
      setDisplayed((prev) => {
        const target = targetRef.current;
        if (target === undefined) return 0;
        if (target <= prev) return prev;
        const diff = target - prev;
        // Snap the last tiny gap so we don't creep forever
        if (diff < 0.3) return target;
        return prev + STEP;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []); // ← mount only — never re-run

  const showProgress = progress !== undefined;
  const displayValue = showProgress ? Math.min(100, Math.max(0, displayed)) : 0;

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

        {/* Progress bar — determinate when progress is given, else indeterminate */}
        <div className="w-72 space-y-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
            <div
              className="absolute inset-0 h-full rounded-full"
              style={
                showProgress
                  ? {
                      width: `${displayValue}%`,
                      background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
                      boxShadow: '0 0 12px hsl(var(--primary)/0.3), 0 0 24px hsl(var(--accent)/0.15)',
                      transition: 'width 0.15s ease-out',
                    }
                  : {
                      background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
                      animation: 'indeterminate-bar 1.8s ease-in-out infinite',
                      width: '40%',
                      boxShadow: '0 0 12px hsl(var(--primary)/0.3), 0 0 24px hsl(var(--accent)/0.15)',
                    }
              }
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            {showProgress ? (
              <>
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: Math.round(displayValue) >= 100 ? '#22C55E' : 'hsl(var(--primary))',
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  {message}
                  <span className="font-medium tabular-nums text-foreground/80">
                    {' '}{Math.round(displayValue)}%
                  </span>
                </p>
              </>
            ) : (
              <>
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: 'hsl(var(--primary))' }}
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
