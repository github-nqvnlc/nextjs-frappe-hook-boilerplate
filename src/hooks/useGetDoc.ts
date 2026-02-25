'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getApiClient } from '@/lib/apiClient';

type UseGetDocOptions<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>;

export function useGetDoc<T = Record<string, unknown>>(
  /** Tên resource, vd: 'tasks', 'users', 'boards' */
  resource: string,
  /** ID của document. Truyền undefined/null để tạm thời disable fetch */
  id: string | undefined | null,
  /** TanStack Query options (staleTime, enabled, ...) */
  options?: UseGetDocOptions<T>,
) {
  const apiClient = getApiClient();

  const query = useQuery<T, Error>({
    queryKey: [resource, id],
    queryFn: async () => {
      const res = await apiClient.get<T>(`/api/resource/${resource}/${id}`);
      // Frappe bọc response trong { data: ... }
      return (res.data as { data?: T }).data ?? res.data;
    },
    // Chỉ fetch khi id có giá trị
    enabled: !!id && options?.enabled !== false,
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
