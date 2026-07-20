import { useInquiryStore } from '@stores';
import { useDataSource } from '@data';
import { LoadingScreen } from '@components/ui';
import { WizardStepIndicator } from './WizardStepIndicator';
import { Step1PersonalInfo } from './Step1PersonalInfo';
import { Step2VehicleSelection } from './Step2VehicleSelection';
import { Step3Result } from './Step3Result';
import { motion, AnimatePresence } from 'framer-motion';

export function ValuationPage() {
  const { currentStep } = useInquiryStore();
  const { isInitializing, error } = useDataSource();

  if (isInitializing) {
    return <LoadingScreen message="Loading vehicle data..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-destructive">Failed to load data source. Please try again.</p>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Personal Info' },
    { num: 2, label: 'Vehicle Selection' },
    { num: 3, label: 'Valuation' },
  ];

  return (
    <section className="bg-slate-50/50 dark:bg-slate-950">
      <AnimatePresence mode="wait">
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mx-auto px-4 py-8 md:py-12"
        >
          <div className="mx-auto max-w-5xl">
            {/* Page header */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold md:text-4xl">Vehicle Valuation</h1>
              <p className="text-muted-foreground">
                Get an accurate market valuation for any vehicle in the UAE
              </p>
            </div>

            {/* Card container — lifts the form off the page background */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none md:p-10">
              {/* Step indicator */}
              <WizardStepIndicator steps={steps} currentStep={currentStep} />

              {/* Step content */}
              <div className="mt-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {currentStep === 1 && <Step1PersonalInfo />}
                    {currentStep === 2 && <Step2VehicleSelection />}
                    {currentStep === 3 && <Step3Result />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
