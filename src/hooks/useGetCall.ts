'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getApiClient } from '@/lib/apiClient';

type UseGetCallOptions<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>;

export function useGetCall<T = Record<string, unknown>>(
  /** Endpoint bất kỳ, vd: '/api/method/frappe.client.get_value' */
  endpoint: string,
  /** Query params */
  params?: Record<string, unknown>,
  /** TanStack Query options */
  options?: UseGetCallOptions<T>,
) {
  const apiClient = getApiClient();

  const query = useQuery<T, Error>({
    queryKey: [endpoint, params],
    queryFn: async () => {
      const res = await apiClient.get<T>(endpoint, { params });
      return (res.data as { message?: T }).message ?? res.data;
    },
    enabled: !!endpoint,
    ...options,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isValidating: query.isFetching,
    error: query.error,
    mutate: query.refetch,
  };
}
