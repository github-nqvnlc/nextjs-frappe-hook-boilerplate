'use client';

import { useState, useEffect, useRef } from 'react';
import { useGetList } from './useGetList';
import { Filter, GetListArgs } from '@/types/hooks';

interface UseDocSearchArgs<T> extends Omit<GetListArgs<T>, 'filters'> {
  filters?: Filter[];
  /** Thời gian debounce (ms). Mặc định: 300 */
  debounceMs?: number;
}

export function useDocSearch<T = Record<string, unknown>>(
  /** Tên resource (Doctype) */
  resource: string,
  /** Từ khoá tìm kiếm */
  searchText: string,
  /** Options bổ sung: filters, limit, fields, debounceMs */
  args?: UseDocSearchArgs<T>,
) {
  const { debounceMs = 300, ...listArgs } = args ?? {};
  const [debouncedText, setDebouncedText] = useState(searchText);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedText(searchText);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchText, debounceMs]);

  // Frappe search thường dùng filter "like" trên field "name" hoặc tên cụ thể
  const searchFilter: Filter[] = debouncedText.trim()
    ? [['name', 'like', `%${debouncedText.trim()}%`]]
    : [];

  const combinedFilters: Filter[] = [
    ...searchFilter,
    ...(listArgs.filters ?? []),
  ];

  const result = useGetList<T>(
    resource,
    {
      ...listArgs,
      filters: combinedFilters.length ? combinedFilters : undefined,
    },
    // Không fetch khi searchText rỗng
    { enabled: !!debouncedText.trim() },
  );

  return {
    data: result.data,
    isLoading: result.isLoading,
    isValidating: result.isValidating,
    error: result.error,
  };
}
