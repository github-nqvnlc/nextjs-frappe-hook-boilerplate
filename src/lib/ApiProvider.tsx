'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createApiClient } from './apiClient';

interface ApiContextValue {
  url: string;
}

// NEXT_PUBLIC_ prefix is required for env vars to be exposed to the browser
const url = process.env.NEXT_PUBLIC_FRAPPE_URL ?? '';

const ApiContext = createContext<ApiContextValue | null>(null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

interface ApiProviderProps {
  children: React.ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  useMemo(() => {
    // Không cần baseURL — axios interceptor tự prefix /*
    // mọi request sẽ đi qua Next.js proxy → Frappe (same-origin, cookie OK)
    createApiClient();
  }, []);

  return (
    <ApiContext.Provider value={{ url }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ApiContext.Provider>
  );
}

export function useApiContext(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error('useApiContext phải được dùng bên trong <ApiProvider>.');
  }
  return ctx;
}
