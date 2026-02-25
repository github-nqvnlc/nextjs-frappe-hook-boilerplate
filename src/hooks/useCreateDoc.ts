'use client';

import { useState, useCallback } from 'react';
import { getApiClient } from '@/lib/apiClient';

export function useCreateDoc<T = Record<string, unknown>>(
  /** Tên resource (Doctype) */
  resource: string,
) {
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setIsCompleted(false);
    setResult(null);
    setError(null);
  }, []);

  const createDoc = useCallback(
    async (data: Partial<T>): Promise<T> => {
      setLoading(true);
      setIsCompleted(false);
      setError(null);
      try {
        const apiClient = getApiClient();
        const res = await apiClient.post<T>(`/api/resource/${resource}`, data);
        // Frappe bọc response trong { data: {...} }
        const created = ((res.data as { data?: T }).data ?? res.data) as T;
        setResult(created);
        setIsCompleted(true);
        return created;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [resource],
  );

  return { createDoc, loading, isCompleted, result, error, reset };
}
