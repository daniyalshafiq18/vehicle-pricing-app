import { cn } from '@utils';
import { Check } from 'lucide-react';

interface Step {
  num: number;
  label: string;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

/**
 * WizardStepIndicator — Premium 3-step progress bar.
 *
 * - Active step: solid violet circle with glow shadow
 * - Completed steps: violet-tinted check icon
 * - Upcoming steps: muted border circle
 * - Connector lines: violet gradient when completed, muted slate otherwise
 */
export function WizardStepIndicator({ steps, currentStep }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.num;
        const isCurrent = currentStep === step.num;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              {/* Step circle */}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                  isCompleted &&
                    'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
                  isCurrent &&
                    'bg-violet-600 font-bold text-white shadow-lg shadow-violet-500/30',
                  !isCompleted &&
                    !isCurrent &&
                    'border-2 border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500',
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className={cn(isCurrent && 'tracking-tight')}>{step.num}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={cn(
                  'mt-2 text-xs font-medium transition-colors duration-300',
                  isCurrent && 'font-semibold text-violet-600 dark:text-violet-400',
                  isCompleted && 'text-muted-foreground',
                  !isCompleted && !isCurrent && 'text-slate-400 dark:text-slate-500',
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line — gradient when completed */}
            {!isLast && (
              <div
                className={cn(
                  'mx-4 h-0.5 w-16 rounded-full transition-all duration-500 md:w-24',
                  currentStep > step.num
                    ? 'bg-gradient-to-r from-violet-500 to-violet-400'
                    : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
