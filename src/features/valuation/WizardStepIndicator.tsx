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
 * - Active step: solid deep-teal circle with glow shadow
 * - Completed steps: primary-tinted check icon
 * - Upcoming steps: muted border circle
 * - Connector lines: primary gradient when completed, muted otherwise
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
                    'bg-primary/10 text-primary',
                  isCurrent &&
                    'bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/30',
                  !isCompleted &&
                    !isCurrent &&
                    'border-2 border-border text-muted-foreground',
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
                  'mt-2 text-sm font-medium transition-colors duration-300',
                  isCurrent && 'font-semibold text-primary',
                  isCompleted && 'text-muted-foreground',
                  !isCompleted && !isCurrent && 'text-muted-foreground',
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
                    ? 'bg-gradient-to-r from-primary to-accent'
                    : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
