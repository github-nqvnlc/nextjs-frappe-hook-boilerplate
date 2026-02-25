# 01. `useAuth` — Xác Thực Người Dùng

Tương đương `useFrappeAuth` trong frappe-react-sdk.

---

## Mục Đích

- Lấy thông tin user đang đăng nhập
- Cung cấp hàm `login` và `logout`
- Tự động redirect về `/login` khi token hết hạn (403/401)

---

## API Trả Về

| Giá trị             | Kiểu                                    | Mô tả                                             |
| ------------------- | --------------------------------------- | ------------------------------------------------- |
| `currentUser`       | `string \| null`                        | ID/email user hiện tại. `null` nếu chưa đăng nhập |
| `isLoading`         | `boolean`                               | Đang kiểm tra auth lần đầu                        |
| `isValidating`      | `boolean`                               | Đang refetch                                      |
| `error`             | `Error \| null`                         | Lỗi nếu có                                        |
| `login`             | `(username, password) => Promise<void>` | Đăng nhập                                         |
| `logout`            | `() => Promise<void>`                   | Đăng xuất                                         |
| `updateCurrentUser` | `() => void`                            | Refetch thủ công                                  |
| `getUserCookie`     | `() => void`                            | Reset auth state (dùng khi nhận 403 từ hook khác) |

---

## Implementation

```ts
// src/hooks/useAuth.ts
"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";
import { clearToken, getToken, setToken } from "@/lib/auth";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string; // Điều chỉnh theo format backend của bạn
  user: AuthUser;
}

const AUTH_QUERY_KEY = ["auth", "currentUser"];

export function useAuth() {
  const queryClient = useQueryClient();
  const apiClient = getApiClient();

  // ─── Fetch current user ──────────────────────────────────────────
  const {
    data: currentUser,
    isLoading,
    isValidating: isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async (): Promise<string | null> => {
      const token = getToken();
      // Không gọi API nếu không có token (giống frappe-react-sdk)
      if (!token) return null;

      try {
        const res = await apiClient.get<AuthUser>("/auth/me");
        return res.data.email; // hoặc res.data.id
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response
          ?.status;
        if (status === 401 || status === 403) {
          clearToken();
          return null;
        }
        throw err;
      }
    },
    // Chỉ fetch khi có token
    enabled: typeof window !== "undefined" && !!getToken(),
    staleTime: 1000 * 60 * 5, // cache 5 phút
    retry: false,
  });

  // ─── Login ───────────────────────────────────────────────────────
  const login = useCallback(
    async (username: string, password: string) => {
      const res = await apiClient.post<LoginResponse>("/auth/login", {
        username,
        password,
      });

      // Lưu token
      setToken(res.data.token);

      // Cập nhật cache
      queryClient.setQueryData(AUTH_QUERY_KEY, res.data.user.email);

      // Invalidate để refetch toàn bộ data
      queryClient.invalidateQueries();
    },
    [apiClient, queryClient],
  );

  // ─── Logout ──────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearToken();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear(); // Xoá toàn bộ cache
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, [apiClient, queryClient]);

  // ─── Update current user ─────────────────────────────────────────
  const updateCurrentUser = useCallback(() => {
    refetch();
  }, [refetch]);

  // ─── Get user cookie / reset auth state ──────────────────────────
  const getUserCookie = useCallback(() => {
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    clearToken();
  }, [queryClient]);

  return {
    currentUser: currentUser ?? null,
    isLoading,
    isValidating: isRefetching,
    error: error as Error | null,
    login,
    logout,
    updateCurrentUser,
    getUserCookie,
  };
}
```

---

## Cách Sử Dụng

### Đăng nhập

```tsx
// src/app/(auth)/login/page.tsx
"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await login(
        form.get("username") as string,
        form.get("password") as string,
      );
      router.push("/boards");
    } catch {
      setError("Sai tài khoản hoặc mật khẩu");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      {error && <p>{error}</p>}
      <button type="submit">Đăng nhập</button>
    </form>
  );
}
```

### Hiển thị user

```tsx
"use client";
import { useAuth } from "@/hooks/useAuth";

export function UserAvatar() {
  const { currentUser, isLoading, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!currentUser) return null;

  return (
    <div>
      <span>{currentUser}</span>
      <button onClick={logout}>Đăng xuất</button>
    </div>
  );
}
```

### Bảo vệ route (Middleware)

```ts
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("app_token")?.value;
  const isPublic = PUBLIC_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/boards", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Điều Chỉnh Theo Backend

| Endpoint        | Mặc định              | Điều chỉnh tại             |
| --------------- | --------------------- | -------------------------- |
| Lấy user        | `GET /auth/me`        | `queryFn` trong `useQuery` |
| Đăng nhập       | `POST /auth/login`    | hàm `login`                |
| Đăng xuất       | `POST /auth/logout`   | hàm `logout`               |
| Field lấy token | `res.data.token`      | hàm `login`                |
| Field user ID   | `res.data.user.email` | hàm `login` và `queryFn`   |

---

Tiếp theo: [02-use-get-doc.md](./02-use-get-doc.md)
