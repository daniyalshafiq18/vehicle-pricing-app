import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@utils';

export const Separator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('h-px w-full bg-border', className)} {...props} />
  ),
);
Separator.displayName = 'Separator';
