'use client';

import { useState, useCallback } from 'react';
import { getApiClient } from '@/lib/apiClient';

function makeMutationHook(method: 'post' | 'put' | 'delete') {
  return function useCall<T = Record<string, unknown>>(
    /** Endpoint bất kỳ, vd: '/api/method/login' */
    endpoint: string,
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

    const call = useCallback(
      async (params?: Record<string, unknown>): Promise<T> => {
        setLoading(true);
        setIsCompleted(false);
        setError(null);
        try {
          const apiClient = getApiClient();
          const res = method === 'delete'
            ? await apiClient.delete<T>(endpoint, { data: params })
            : await apiClient[method]<T>(endpoint, params);

          const data: T =
            (res.data as { message?: T }).message ??
            (res.data as { data?: T }).data ??
            res.data;
          setResult(data);
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
      [endpoint],
    );

    return { call, loading, isCompleted, result, error, reset };
  };
}

export const usePostCall = makeMutationHook('post');
export const usePutCall = makeMutationHook('put');
export const useDeleteCall = makeMutationHook('delete');
