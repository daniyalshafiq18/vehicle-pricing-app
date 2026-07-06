export interface PriceSuggestion {
  id: string;
  comment?: string;
  minPrice?: number;
  maxPrice?: number;
  sourceUrl?: string;
  submittedBy?: string;
  vehicleId?: string;
  /** Display label from Dataverse (e.g. "Pending", "Approved"). */
  status?: string;
  /** Raw integer value from Dataverse (e.g. 4 for Pending). */
  statusValue?: number;
  createdOn?: Date;
}
