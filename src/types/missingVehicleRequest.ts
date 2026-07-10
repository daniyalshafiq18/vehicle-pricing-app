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
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  createdOn?: Date;
  contactName?: string;
  contactEmail?: string;
}
