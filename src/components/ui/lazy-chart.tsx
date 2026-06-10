import { useRef, useState, useEffect, type ReactNode } from 'react';

interface LazyChartProps {
  children: ReactNode;
  /** Height to reserve while chart is not yet rendered (default: 320px) */
  height?: number;
  /** If true, render immediately without intersection observer */
  immediate?: boolean;
  /** Root margin for IntersectionObserver (default: '200px' = load 200px early) */
  rootMargin?: string;
  /** Placeholder to show while hidden */
  placeholder?: ReactNode;
}

/**
 * LazyChart — defers rendering of its children until the element
 * is near the viewport (using IntersectionObserver).
 *
 * Keeps the layout stable by reserving the specified height.
 */
export function LazyChart({
  children,
  height = 320,
  immediate = false,
  rootMargin = '200px',
  placeholder,
}: LazyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate, rootMargin]);

  return (
    <div ref={ref} style={{ minHeight: height }} className="relative">
      {visible ? (
        children
      ) : (
        placeholder ?? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40">
            <div className="animate-pulse space-y-3 w-full px-4">
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-[200px] rounded-lg bg-muted/50" />
            </div>
          </div>
        )
      )}
    </div>
  );
}
