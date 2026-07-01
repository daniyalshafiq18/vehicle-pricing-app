export interface MissingVehicleRequest {
  id: string;
  make: string;
  model: string;
  bodyType: string;
  trim: string;
  modelYear: number;
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  name?: string;
  createdOn?: Date;
}
