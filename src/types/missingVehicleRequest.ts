export interface MissingVehicleRequest {
  id: string;
  make: string;
  model: string;
  bodyType: string;
  trim: string;
  modelYear: number;
  cylinders?: string;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
  status?: string;
  statusValue?: number;
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  createdOn?: Date;
  contactName?: string;
  contactEmail?: string;
  // Scrape result fields (populated by Power Automate Flow 2)
  scrapeStatus?: string;
  scrapeStatusValue?: number;
  scrapedListings?: string;
  scrapedMinPrice?: number;
  scrapedMaxPrice?: number;
  scrapedSources?: string;
}
