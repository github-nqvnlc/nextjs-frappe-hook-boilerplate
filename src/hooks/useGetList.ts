'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getApiClient } from '@/lib/apiClient';
import { Filter, GetListArgs } from '@/types/hooks';

/** Chuyển filters array thành query string JSON */
function serializeFilters(filters: Filter[]): string {
  return JSON.stringify(filters);
}

type UseGetListOptions<T> = Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>;

export function useGetList<T = Record<string, unknown>>(
  /** Tên resource (Doctype), vd: 'Task', 'Project' */
  resource: string,
  /** Điều kiện lọc, sắp xếp, phân trang, fields */
  args?: GetListArgs<T>,
  /** TanStack Query options (staleTime, enabled, ...) */
  options?: UseGetListOptions<T>,
) {
  const apiClient = getApiClient();

  const queryKey = [resource, 'list', args];

  const query = useQuery<T[], Error>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (args?.fields?.length) {
        params.fields = JSON.stringify(args.fields);
      }
      if (args?.filters?.length) {
        params.filters = serializeFilters(args.filters);
      }
      if (args?.orFilters?.length) {
        params.or_filters = serializeFilters(args.orFilters);
      }
      if (args?.limit_start !== undefined) {
        params.limit_start = args.limit_start;
      }
      if (args?.limit !== undefined) {
        params.limit = args.limit;
      } else {
        params.limit = 20; // mặc định
      }
      if (args?.orderBy) {
        params.order_by = `${args.orderBy.field} ${args.orderBy.order}`;
      }
      if (args?.asDict) {
        params.as_dict = 1;
      }

      const res = await apiClient.get<T[]>(`/api/resource/${resource}`, { params });

      // Frappe bọc response trong { data: [...] }
      return (res.data as { data?: T[] }).data ?? res.data;
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
