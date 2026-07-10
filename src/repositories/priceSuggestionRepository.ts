import { getDataSource } from '@data';
import type { PriceSuggestion } from '@types';

export class PriceSuggestionRepository {
  async upsert(payload: {
    comment?: string;
    minPrice?: number;
    maxPrice?: number;
    sourceUrl?: string;
    submittedBy?: string;
    vehicleId: string;
  }): Promise<string> {
    const ds = getDataSource();
    return ds.upsertPriceSuggestion(payload);
  }

  async getAll(): Promise<PriceSuggestion[]> {
    const ds = getDataSource();
    return ds.getPriceSuggestions();
  }

  async update(id: string, minPrice: number | null, maxPrice: number | null): Promise<void> {
    const ds = getDataSource();
    return ds.updatePriceSuggestion(id, minPrice, maxPrice);
  }

  async updateStatus(id: string, statusValue: number): Promise<void> {
    const ds = getDataSource();
    return ds.updatePriceSuggestionStatus(id, statusValue);
  }
}

export const priceSuggestionRepository = new PriceSuggestionRepository();
