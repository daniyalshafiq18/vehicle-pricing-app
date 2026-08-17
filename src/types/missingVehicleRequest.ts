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
}
