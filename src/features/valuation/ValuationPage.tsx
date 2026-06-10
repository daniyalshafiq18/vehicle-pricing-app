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
  const { isInitialized, isInitializing } = useDataSource();

  if (isInitializing) {
    return <LoadingScreen message="Loading vehicle data..." />;
  }

  if (!isInitialized) {
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
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">Vehicle Valuation</h1>
          <p className="text-muted-foreground">
            Get an accurate market valuation for any vehicle in the UAE
          </p>
        </div>

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
  );
}
