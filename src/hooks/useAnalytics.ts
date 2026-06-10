import { useQuery } from '@tanstack/react-query';
import { analyticsRepository } from '@repositories';
import { useAdminStore } from '@stores';
import { useEffect } from 'react';

const ANALYTICS_KEY = 'analytics';

export function useAnalytics() {
  const setAnalytics = useAdminStore((s) => s.setAnalytics);
  const setLoading = useAdminStore((s) => s.setLoading);
  const setError = useAdminStore((s) => s.setError);

  const query = useQuery({
    queryKey: [ANALYTICS_KEY],
    queryFn: () => analyticsRepository.getAnalytics(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setAnalytics(query.data);
    setLoading(query.isLoading);
    if (query.error) setError(query.error.message);
  }, [query.data, query.isLoading, query.error, setAnalytics, setLoading, setError]);

  return query;
}
