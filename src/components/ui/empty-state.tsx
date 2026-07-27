import { type ReactNode } from 'react';
import { cn } from '@utils';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-8 text-center',
        className,
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      {description && <p className="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
