'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/apiClient';

// ── Types ─────────────────────────────────────────────────────────────

export interface FrappeUser {
  name: string;        // username / email, vd: "Administrator"
  full_name: string;   // Tên đầy đủ
  user_image?: string; // Avatar URL
  email?: string;
  roles?: string[];
}


interface FrappeLoginResponse {
  message: string;      // "Logged In"
  home_page: string;    // "/"
  full_name: string;    // "Administrator"
}

const AUTH_QUERY_KEY = ['auth', 'currentUser'];

// ── Hook ──────────────────────────────────────────────────────────────

export function useAuth() {
  const queryClient = useQueryClient();
  const apiClient = getApiClient();

  // ── Fetch current user ─────────────────────────────────────────────
  // Frappe endpoint: GET /api/method/frappe.auth.get_logged_user
  // Trả về: "Administrator" (string) — không phải object
  const {
    data: currentUser,
    isLoading,
    isFetching: isValidating,
    error,
    refetch,
  } = useQuery<string | null, Error>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ message: string }>(
          '/api/method/frappe.auth.get_logged_user',
        );
        const user = res.data?.message;
        return user && user !== 'Guest' ? user : null;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status;
        // Session hết hạn — redirect sang /login nhưng chỉ khi không đang ở /login
        if ((status === 401 || status === 403) && typeof window !== 'undefined') {
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // cache 5 phút
    retry: false,
  });

  // ── Login ──────────────────────────────────────────────────────────
  // POST /api/method/login với { usr, pwd }
  const login = useCallback(
    async (usr: string, pwd: string): Promise<FrappeLoginResponse> => {
      const res = await apiClient.post<FrappeLoginResponse>(
        '/api/method/login',
        { usr, pwd },
      );
      // Sau login thành công, Frappe tự set cookie "sid"
      // Refetch để lấy thông tin user hiện tại
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      return res.data;
    },
    [apiClient, queryClient],
  );

  // ── Logout ─────────────────────────────────────────────────────────
  // POST /api/method/logout — Frappe tự xóa cookie "sid"
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/method/logout');
    } finally {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [apiClient, queryClient]);

  // ── Update current user (refetch) ─────────────────────────────────
  const updateCurrentUser = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── getUserCookie — reset auth state khi gặp 403 ──────────────────
  const getUserCookie = useCallback(() => {
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  }, [queryClient]);

  return {
    /** Email/username của user đang đăng nhập. null nếu chưa login. */
    currentUser: currentUser ?? null,
    isLoading,
    isValidating,
    error,
    login,
    logout,
    updateCurrentUser,
    getUserCookie,
  };
}
