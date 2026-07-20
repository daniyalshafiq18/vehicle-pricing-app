import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  inquiryRepository,
  missingVehicleRepository,
  priceSuggestionRepository,
} from '@repositories';

const STARTUP_REQUESTS = 3;

/**
 * Prefetch the three admin datasets that mount immediately after the data
 * source is ready. Progress advances only when an actual request settles.
 */
export function useStartupData(enabled: boolean) {
  const queryClient = useQueryClient();
  const startedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    let completed = 0;

    const track = async (request: Promise<void>) => {
      try {
        await request;
      } finally {
        completed += 1;
        if (!cancelled) {
          setProgress(Math.round((completed / STARTUP_REQUESTS) * 100));
        }
      }
    };

    const load = async () => {
      await Promise.allSettled([
        track(queryClient.prefetchQuery({
          queryKey: ['inquiries'],
          queryFn: () => inquiryRepository.getAll(),
        })),
        track(queryClient.prefetchQuery({
          queryKey: ['missing-vehicle-requests'],
          queryFn: () => missingVehicleRepository.getAll(),
          staleTime: 30_000,
        })),
        track(queryClient.prefetchQuery({
          queryKey: ['price-suggestions'],
          queryFn: () => priceSuggestionRepository.getAll(),
          staleTime: 30_000,
        })),
      ]);

      if (!cancelled) {
        setProgress(100);
        window.setTimeout(() => {
          if (!cancelled) setIsReady(true);
        }, 300);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, queryClient]);

  return { progress, isReady };
}
