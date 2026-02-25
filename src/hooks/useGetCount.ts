'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getApiClient } from '@/lib/apiClient';
import { Filter } from '@/types/hooks';

function serializeFilters(filters: Filter[]): string {
  return JSON.stringify(filters);
}

type UseGetCountOptions = Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>;

export function useGetCount(
  /** Tên resource (Doctype) */
  resource: string,
  /** Filters — AND condition */
  filters?: Filter[],
  /** Bật debug log */
  debug?: boolean,
  /** TanStack Query options */
  options?: UseGetCountOptions,
) {
  const apiClient = getApiClient();

  const query = useQuery<number, Error>({
    queryKey: [resource, 'count', filters],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (filters?.length) {
        params.filters = serializeFilters(filters);
      }

      const res = await apiClient.get<number>(`/api/resource/${resource}`, {
        params: { ...params, fields: JSON.stringify(['name']), limit_page_length: 0 },
      });

      // Frappe trả về { data: [...] } — đếm số phần tử
      const raw = res.data as { data?: unknown[] } | unknown[];
      const list = Array.isArray(raw) ? raw : (raw as { data?: unknown[] }).data ?? [];
      const count = list.length;

      if (debug) console.log(`[useGetCount] ${resource}:`, count, 'raw:', raw);
      return count;
    },
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
