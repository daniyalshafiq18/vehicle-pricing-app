import type { Inquiry } from '@types';
import { getDataSource } from '@data';

export class InquiryRepository {
  async save(inquiry: Inquiry): Promise<void> {
    const ds = getDataSource();
    return ds.saveInquiry(inquiry);
  }

  async getAll(): Promise<Inquiry[]> {
    const ds = getDataSource();
    return ds.getInquiries();
  }

  async getById(id: string): Promise<Inquiry | null> {
    const ds = getDataSource();
    return ds.getInquiryById(id);
  }

  async updateStatus(id: string, status: Inquiry['status']): Promise<void> {
    const ds = getDataSource();
    return ds.updateInquiryStatus(id, status);
  }
}

export const inquiryRepository = new InquiryRepository();
