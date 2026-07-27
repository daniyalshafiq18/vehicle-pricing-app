import { forwardRef } from 'react';
import { cn } from '@utils';

export interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
  label?: string;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, className, indicatorClassName, showLabel, label }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div className="space-y-1">
        {(showLabel || label) && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{label}</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          ref={ref}
          className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
        >
          <div
            className={cn('h-full w-full flex-1 rounded-full bg-primary transition-all duration-500 ease-out', indicatorClassName)}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </div>
      </div>
    );
  },
);

Progress.displayName = 'Progress';
