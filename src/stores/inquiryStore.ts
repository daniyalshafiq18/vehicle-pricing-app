import { create } from 'zustand';
import type { InquiryState } from '@types';
import type { InquiryFormData, VehicleSelectionData, Inquiry } from '@types';

const defaultPersonalInfo: InquiryFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: 'United Arab Emirates',
  city: '',
  consent: false,
};

const defaultVehicleSelection: VehicleSelectionData = {
  year: null,
  make: '',
  model: '',
  spec: '',
  bodyType: '',
};

export const useInquiryStore = create<InquiryState>()((set) => ({
  currentStep: 1,
  personalInfo: defaultPersonalInfo,
  vehicleSelection: defaultVehicleSelection,
  inquiries: [],
  selectedInquiry: null,
  isLoading: false,

  setStep: (step: number) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 3) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

  setPersonalInfo: (data: Partial<InquiryFormData>) =>
    set((state) => ({ personalInfo: { ...state.personalInfo, ...data } })),

  setVehicleSelection: (data: Partial<VehicleSelectionData>) =>
    set((state) => ({ vehicleSelection: { ...state.vehicleSelection, ...data } })),

  reset: () =>
    set({
      currentStep: 1,
      personalInfo: defaultPersonalInfo,
      vehicleSelection: defaultVehicleSelection,
    }),

  setInquiries: (inquiries: Inquiry[]) => set({ inquiries }),
  setSelectedInquiry: (inquiry: Inquiry | null) => set({ selectedInquiry: inquiry }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));
