import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inquiryRepository } from '@repositories';
import { useInquiryStore } from '@stores';
import type { Inquiry } from '@types';
import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const INQUIRIES_KEY = 'inquiries';

export function useInquiries() {
  const setInquiries = useInquiryStore((s) => s.setInquiries);
  const setLoading = useInquiryStore((s) => s.setLoading);

  const query = useQuery({
    queryKey: [INQUIRIES_KEY],
    queryFn: () => inquiryRepository.getAll(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (query.data) setInquiries(query.data);
    setLoading(query.isLoading);
  }, [query.data, query.isLoading, setInquiries, setLoading]);

  return query;
}

export function useSaveInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiry: Inquiry) => inquiryRepository.save(inquiry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INQUIRIES_KEY] });
      toast.success('Inquiry saved successfully');
    },
    onError: () => {
      toast.error('Failed to save inquiry');
    },
  });
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Inquiry['status'] }) =>
      inquiryRepository.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INQUIRIES_KEY] });
      toast.success('Status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });
}

export function useExportInquiries() {
  return useCallback(async () => {
    const inquiries = await inquiryRepository.getAll();
    if (!inquiries.length) {
      toast.error('No inquiries to export');
      return;
    }

    const data = inquiries.map((inq, i) => ({
      '#': i + 1,
      'First Name': inq.firstName,
      'Last Name': inq.lastName,
      'Email': inq.email,
      'Phone': inq.phone,
      'City': inq.city,
      'Country': inq.country,
      'Year': inq.selectedVehicle.year,
      'Make': inq.selectedVehicle.make,
      'Model': inq.selectedVehicle.model,
      'Spec': inq.selectedVehicle.spec,
      'Body Type': inq.selectedVehicle.bodyType,
      'Status': inq.status,
      'Avg Price': inq.valuationResult?.pricing.averagePrice ?? '',
      'Min Price': inq.valuationResult?.pricing.minimumPrice ?? '',
      'Max Price': inq.valuationResult?.pricing.maximumPrice ?? '',
      'Median Price': inq.valuationResult?.pricing.medianPrice ?? '',
      'Submitted': new Date(inq.createdAt).toLocaleDateString('en-US'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inquiries');
    XLSX.writeFile(wb, `inquiries-export-${Date.now()}.xlsx`);
    toast.success(`Exported ${inquiries.length} inquiries`);
  }, []);
}
