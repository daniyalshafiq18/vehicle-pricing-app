export type MissingVehiclePricingDecisionStatus =
  | 'Awaiting Scrapes'
  | 'Scraping'
  | 'Ready for Review'
  | 'Needs Attention'
  | 'Approved'
  | 'Rejected';

export type MissingVehiclePricingDecisionMethod =
  | 'Single Source'
  | 'Combined Sources'
  | 'Manual Override';

export interface SaveMissingVehiclePricingDecisionInput {
  approvedMinimumPrice: number;
  approvedMaximumPrice: number;
  pricingDecisionStatusValue: number;
  pricingDecisionMethodValue: number;
  reviewedScrapeRunId: string;
  primaryPriceResultId: string | null;
  selectedSpecificationResultId: string;
  decisionNotes: string | null;
  decidedOn: Date | null;
}

export interface MissingVehicleRequest {
  id: string;
  name?: string;
  make: string;
  model: string;
  bodyType: string;
  trim: string;
  modelYear: number;
  cylinders?: string;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
  engineSize?: number;
  horsepower?: number;
  doors?: string;
  seats?: string;
  category?: string;
  categoryValue?: number;
  status?: string;
  statusValue?: number;
  minPrice?: number;
  maxPrice?: number;
  mileage?: number; // scraped mileage (vpi_mileage, decimal)
  createdOn?: Date;
  contactName?: string;
  contactEmail?: string;
  // Scrape result fields (populated by Power Automate Flow 2/3)
  scrapeStatus?: string;
  scrapeStatusValue?: number;
  scrapedListings?: string;
  scrapedMinPrice?: number;
  scrapedMaxPrice?: number;
  scrapedSources?: string;
  // Admin-owned multi-source pricing decision fields.
  approvedMinimumPrice?: number;
  approvedMaximumPrice?: number;
  pricingDecisionStatus?: MissingVehiclePricingDecisionStatus;
  pricingDecisionStatusValue?: number;
  pricingDecisionMethod?: MissingVehiclePricingDecisionMethod;
  pricingDecisionMethodValue?: number;
  reviewedScrapeRunId?: string;
  primaryPriceResultId?: string;
  selectedSpecificationResultId?: string;
  decisionNotes?: string;
  decidedByContactId?: string;
  decidedOn?: Date;
}
