import { useEffect, useRef, useState } from 'react';
import { cn } from '@utils';
import { Car } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  className?: string;
  /** 0–100. When provided the bar is determinate. */
  progress?: number;
}

export function LoadingScreen({ message = 'Loading...', className, progress }: LoadingScreenProps) {
  const target = progress ?? 0;
  const smoothValue = useRef(target);
  const rafId = useRef<number | null>(null);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const animate = () => {
      const current = smoothValue.current;
      const diff = target - current;

      if (Math.abs(diff) < 0.3) {
        // Close enough — snap to target and stop animating
        smoothValue.current = target;
        setDisplay(target);
        rafId.current = null;
        return;
      }

      // Exponential decay toward target — produces a smooth crawl
      smoothValue.current = current + diff * 0.1;
      setDisplay(smoothValue.current);
      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [target]);

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
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-[#19b8a5]/10 blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 h-56 w-56 rounded-full bg-[#8fb6cc]/12 blur-3xl" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Car icon with rotating ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer scanning ring */}
          <div
            className="absolute h-28 w-28 rounded-full border-2 border-[#19b8a5]/20"
            style={{
              animation: 'spin 3s linear infinite',
              borderTopColor: '#19b8a5',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            }}
          />
          <div
            className="absolute h-24 w-24 rounded-full border border-[#8fb6cc]/25"
            style={{
              animation: 'spin 2s linear infinite reverse',
              borderTopColor: '#8fb6cc',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            }}
          />

          {/* Car icon */}
          <div className="animate-bounce-gentle">
            <Car className="h-16 w-16 text-[#19b8a5] drop-shadow-[0_0_15px_rgba(25,184,165,0.35)]" />
          </div>
        </div>

        {/* Brand title with tagline */}
        <div className="space-y-1 text-center">
          <p className="text-lg font-semibold text-foreground">
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
              className="h-full rounded-full bg-gradient-to-r from-[#19b8a5] via-[#8fb6cc] to-[#19b8a5]"
              style={{ width: `${display}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{message}</p>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {Math.round(display)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
