'use client';

import { useState, useCallback } from 'react';
import { getApiClient } from '@/lib/apiClient';

export function useDeleteDoc(
  /** Tên resource (Doctype) */
  resource: string,
) {
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setIsCompleted(false);
    setError(null);
  }, []);

  const deleteDoc = useCallback(
    async (id: string): Promise<{ message: string }> => {
      setLoading(true);
      setIsCompleted(false);
      setError(null);
      try {
        const apiClient = getApiClient();
        const res = await apiClient.delete<{ message: string }>(
          `/api/resource/${resource}/${id}`,
        );
        const data = (res.data as { message?: string }).message
          ? (res.data as { message: string })
          : { message: 'ok' };
        setIsCompleted(true);
        return data;
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

  return { deleteDoc, loading, isCompleted, error, reset };
}
