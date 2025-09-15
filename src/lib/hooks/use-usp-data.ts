import { useQuery } from '@tanstack/react-query';
import { USPData } from '@/lib/services/api-registry';

/**
 * Custom hook to fetch and manage USP data
 */
export function useUSPData() {
  return useQuery<USPData>({
    queryKey: ['usp-data'],
    queryFn: async () => {
      const response = await fetch('/api/usp-data');
      if (!response.ok) {
        throw new Error('Failed to fetch USP data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}

/**
 * Hook to get formatted USP metrics for display
 */
export function useUSPMetrics() {
  const { data: uspData, isLoading, error, refetch } = useUSPData();

  return {
    metrics: uspData ? {
      totalDataSources: uspData.totalDataSources,
      activeAPIs: uspData.activeAPIs,
      totalEvents: uspData.totalEvents,
      coverage: uspData.coverage,
      dataSources: uspData.dataSources,
    } : null,
    isLoading,
    error,
    lastUpdated: uspData?.lastUpdated,
    refetch,
  };
}
