import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] select-none',
  {
    variants: {
      variant: {
        default: 'bg-[#19b8a5] text-white shadow visited:text-white hover:bg-[#14a794] hover:text-white hover:shadow-md hover:shadow-[rgba(25,184,165,0.22)] focus:text-white active:text-white',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-[#d9e2e8] bg-transparent text-[#071936] shadow-sm visited:text-[#071936] hover:border-[#19b8a5]/40 hover:bg-[#ecfbf8] hover:text-[#08766c] hover:shadow-sm focus:text-[#08766c] active:text-[#08766c] dark:border-[#31545a] dark:text-white dark:visited:text-white dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5] dark:focus:text-[#19b8a5] dark:active:text-[#19b8a5]',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-[#ecfbf8] hover:text-[#08766c] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]',
        link: 'text-[#08766c] underline-offset-4 hover:underline',
        gradient: 'relative overflow-hidden bg-gradient-to-r from-[#19b8a5] via-[#0b7f78] to-[#08766c] text-white shadow-lg shadow-[rgba(25,184,165,0.22)] visited:text-white hover:from-[#14a794] hover:via-[#08766c] hover:to-[#0b7f78] hover:text-white hover:shadow-[rgba(25,184,165,0.3)] hover:scale-[1.02] focus:text-white active:from-[#08766c] active:via-[#0b7f78] active:to-[#08766c] active:text-white',
        'gradient-accent': 'relative overflow-hidden bg-gradient-to-r from-[#19b8a5] via-[#8fb6cc] to-[#0b7f78] text-white shadow-lg shadow-[rgba(25,184,165,0.22)] visited:text-white hover:from-[#14a794] hover:via-[#19b8a5] hover:to-[#08766c] hover:text-white hover:shadow-[rgba(25,184,165,0.3)] hover:scale-[1.02] focus:text-white active:from-[#08766c] active:via-[#19b8a5] active:to-[#0b7f78] active:text-white',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        xl: 'h-14 rounded-xl px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  },
);

Button.displayName = 'Button';
