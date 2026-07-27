import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, required, onBlur, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const [touched, setTouched] = useState(false);

    const showError = error && (required ? touched : true);

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          required={required}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
            'border-input placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            showError && 'border-destructive focus-visible:ring-destructive',
            !showError && required && touched && 'border-red-300 focus-visible:ring-red-500',
            className,
          )}
          ref={ref}
          onBlur={(e) => {
            setTouched(true);
            onBlur?.(e);
          }}
          {...props}
        />
        {showError && <p className="text-xs text-destructive">{error}</p>}
        {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
