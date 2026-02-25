# 00. Nền Tảng: `ApiProvider` & `apiClient`

> Đây là bước đầu tiên phải làm trước khi viết bất kỳ hook nào. Tất cả các hooks khác đều phụ thuộc vào `ApiProvider` và `apiClient`.

---

## Cài Đặt Dependencies

```bash
npm install axios @tanstack/react-query
```

---

## Bước 1: Types Dùng Chung

```ts
// src/types/hooks.ts

export type FilterOperator =
  | "="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">="
  | "like"
  | "not like"
  | "in"
  | "not in"
  | "is"
  | "between";

/** [field, operator, value] */
export type Filter = [string, FilterOperator, unknown];

export interface GetListArgs<T = Record<string, unknown>> {
  /** Chỉ lấy các field này. Mặc định: lấy tất cả */
  fields?: (keyof T | string)[];
  /** Điều kiện AND */
  filters?: Filter[];
  /** Điều kiện OR */
  orFilters?: Filter[];
  /** Bỏ qua n bản ghi đầu (dùng cho pagination) */
  limit_start?: number;
  /** Số bản ghi mỗi trang. Mặc định: 20 */
  limit?: number;
  /** Sắp xếp */
  orderBy?: { field: string; order: "asc" | "desc" };
  /** Trả về key-value dict thay vì array */
  asDict?: boolean;
}

export interface TokenParams {
  useToken: boolean;
  /** Token string hoặc hàm trả về token */
  token: string | (() => string);
  /** Prefix trong Authorization header */
  type: "Bearer" | "token";
}

export interface UploadArgs {
  /** File có private không. Mặc định: false */
  isPrivate?: boolean;
  /** Folder đích */
  folder?: string;
  /** File URL nếu đã có */
  file_url?: string;
  /** Doctype liên kết */
  doctype?: string;
  /** ID của document liên kết */
  docname?: string;
  /** Field trong document sẽ lưu file */
  fieldname?: string;
}
```

---

## Bước 2: `auth.ts` — Token Helpers

```ts
// src/lib/auth.ts
const TOKEN_KEY = "app_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
```

> **Lưu ý Next.js**: Vì `localStorage` chỉ có ở browser, luôn kiểm tra `typeof window !== 'undefined'` trước khi dùng. Hoặc dùng cookie để an toàn hơn với SSR.

---

## Bước 3: `apiClient.ts` — Axios Instance

```ts
// src/lib/apiClient.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { clearToken, getToken } from "./auth";
import { TokenParams } from "@/types/hooks";

let _apiClient: AxiosInstance | null = null;
let _tokenParams: TokenParams | null = null;

/** Khởi tạo apiClient — chỉ gọi 1 lần trong ApiProvider */
export function createApiClient(baseURL: string, tokenParams?: TokenParams) {
  _tokenParams = tokenParams ?? null;

  _apiClient = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { "Content-Type": "application/json" },
    withCredentials: true, // gửi cookie cùng request
  });

  // ─── Request Interceptor: gắn token ───────────────────────────────
  _apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (_tokenParams?.useToken) {
      const token =
        typeof _tokenParams.token === "function"
          ? _tokenParams.token()
          : _tokenParams.token;

      if (token) {
        config.headers.Authorization = `${_tokenParams.type} ${token}`;
      }
    }
    return config;
  });

  // ─── Response Interceptor: xử lý lỗi tập trung ───────────────────
  _apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        clearToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      // Chuẩn hoá error message
      const message =
        error.response?.data?.message ??
        error.response?.data?.error ??
        error.message ??
        "Unknown error";
      return Promise.reject(new Error(message));
    },
  );

  return _apiClient;
}

/** Lấy apiClient đã khởi tạo */
export function getApiClient(): AxiosInstance {
  if (!_apiClient) {
    throw new Error(
      "ApiClient chưa được khởi tạo. Hãy wrap app bằng <ApiProvider>.",
    );
  }
  return _apiClient;
}
```

---

## Bước 4: `ApiProvider.tsx` — React Context

```tsx
// src/lib/ApiProvider.tsx
"use client"; // Next.js App Router — provider phải là Client Component

import React, { createContext, useContext, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "./apiClient";
import { TokenParams } from "@/types/hooks";

interface ApiContextValue {
  url: string;
}

const ApiContext = createContext<ApiContextValue | null>(null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 giây
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

interface ApiProviderProps {
  /** Base URL của backend API. Mặc định: NEXT_PUBLIC_API_BASE_URL */
  url?: string;
  /** Cấu hình token auth */
  tokenParams?: TokenParams;
  children: React.ReactNode;
}

export function ApiProvider({
  url = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  tokenParams,
  children,
}: ApiProviderProps) {
  useEffect(() => {
    createApiClient(url, tokenParams);
  }, [url, tokenParams]);

  // Khởi tạo ngay để tránh race condition
  createApiClient(url, tokenParams);

  return (
    <ApiContext.Provider value={{ url }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiContext.Provider>
  );
}

export function useApiContext() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApiContext phải dùng bên trong <ApiProvider>");
  return ctx;
}
```

---

## Bước 5: Đăng Ký `ApiProvider` Trong Next.js

```tsx
// src/app/layout.tsx
import { ApiProvider } from "@/lib/ApiProvider";
import { getToken } from "@/lib/auth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <ApiProvider
          url={process.env.NEXT_PUBLIC_API_BASE_URL}
          tokenParams={{
            useToken: true,
            token: () => getToken() ?? "",
            type: "Bearer",
          }}
        >
          {children}
        </ApiProvider>
      </body>
    </html>
  );
}
```

---

## Bước 6: Biến Môi Trường

```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://api.your-backend.com
```

---

## Kiểm Tra

Tạo một component test đơn giản:

```tsx
// src/app/page.tsx
"use client";
import { useApiContext } from "@/lib/ApiProvider";

export default function Home() {
  const { url } = useApiContext();
  return <div>Connected to: {url}</div>;
}
```

Nếu hiển thị được URL → setup thành công. Chuyển sang bước tiếp theo: [01-use-auth.md](./01-use-auth.md).
