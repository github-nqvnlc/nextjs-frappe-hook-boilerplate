import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

let _apiClient: AxiosInstance | null = null;

/**
 * Lấy CSRF token từ cookie (Frappe gửi trong cookie "csrf_token")
 */
function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function createApiClient() {
  _apiClient = axios.create({
    // Không set baseURL — hook gọi /api/... trực tiếp, Next.js rewrite forward sang Frappe
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    // Bắt buộc để gửi cookie session cùng request
    withCredentials: true,
  });

  // ── Request Interceptor: CSRF token cho mutation ─────────────────
  _apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase();
    if (method && method !== 'GET' && method !== 'HEAD') {
      const csrf = getCsrfToken();
      if (csrf) {
        config.headers['X-Frappe-CSRF-Token'] = csrf;
      }
    }
    return config;
  });

  // ── Response Interceptor ─────────────────────────────────────────
  // Không auto-redirect ở đây — để hook tự xử lý (tránh vòng lặp /login)
  _apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const message =
        error.response?.data?.message ??
        error.response?.data?.exception ??
        error.response?.data?._error_message ??
        error.message ??
        'Unknown error';
      return Promise.reject(new Error(message));
    },
  );

  return _apiClient;
}

/** Lấy instance đã khởi tạo */
export function getApiClient(): AxiosInstance {
  if (!_apiClient) {
    throw new Error(
      'ApiClient chưa được khởi tạo. Hãy wrap ứng dụng bằng <ApiProvider>.',
    );
  }
  return _apiClient;
}
