import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inquiryRepository } from '@repositories';
import { useInquiryStore } from '@stores';
import type { Inquiry } from '@types';
import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

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

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'City', 'Country',
      'Year', 'Make', 'Model', 'Spec', 'Body Type', 'Status',
      'Avg Price', 'Min Price', 'Max Price', 'Median Price', 'Submitted'];
    const rows = inquiries.map((inq) => [
      inq.firstName, inq.lastName, inq.email, inq.phone, inq.city, inq.country,
      inq.selectedVehicle.year, inq.selectedVehicle.make, inq.selectedVehicle.model,
      inq.selectedVehicle.spec, inq.selectedVehicle.bodyType, inq.status,
      inq.valuationResult?.pricing.averagePrice ?? '',
      inq.valuationResult?.pricing.minimumPrice ?? '',
      inq.valuationResult?.pricing.maximumPrice ?? '',
      inq.valuationResult?.pricing.medianPrice ?? '',
      new Date(inq.createdAt).toLocaleDateString('en-US'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiries-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${inquiries.length} inquiries`);
  }, []);
}
