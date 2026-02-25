'use client';

import { useState, useCallback } from 'react';
import { getApiClient } from '@/lib/apiClient';

export function useUpdateDoc<T = Record<string, unknown>>(
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

  const updateDoc = useCallback(
    async (id: string, data: Partial<T>): Promise<T> => {
      setLoading(true);
      setIsCompleted(false);
      setError(null);
      try {
        const apiClient = getApiClient();
        // Frappe Resource API dùng PUT để update
        const res = await apiClient.put<T>(`/api/resource/${resource}/${id}`, data);
        const updated = ((res.data as { data?: T }).data ?? res.data) as T;
        setResult(updated);
        setIsCompleted(true);
        return updated;
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

  return { updateDoc, loading, isCompleted, result, error, reset };
}
