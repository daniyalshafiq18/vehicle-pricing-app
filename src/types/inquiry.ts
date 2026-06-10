export interface Inquiry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  consent: boolean;
  selectedVehicle: {
    year: number;
    make: string;
    model: string;
    spec: string;
    bodyType: string;
  };
  valuationResult?: import('./vehicle').ValuationResult;
  createdAt: Date;
  status: InquiryStatus;
}

export type InquiryStatus = 'pending' | 'reviewed' | 'contacted' | 'closed';

export interface InquiryFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  consent: boolean;
}

export interface VehicleSelectionData {
  year: number | null;
  make: string;
  model: string;
  spec: string;
  bodyType: string;
}

export interface ValuationWizardData {
  step: number;
  personalInfo: InquiryFormData;
  vehicleSelection: VehicleSelectionData;
}

export interface InquirySummary {
  total: number;
  pending: number;
  reviewed: number;
  contacted: number;
  closed: number;
  recentInquiries: Inquiry[];
}
