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
  status?: string;
  minMileage?: number;
  maxMileage?: number;
  createdOn?: Date;
}
