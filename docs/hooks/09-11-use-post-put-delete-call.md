# 09–11. `usePostCall`, `usePutCall`, `useDeleteCall` — Gọi Mutation Endpoint

Tương đương `useFrappePostCall`, `useFrappePutCall`, `useFrappeDeleteCall`.

---

## Mục Đích

Gọi các endpoint POST / PUT / DELETE tùy chỉnh (không theo pattern CRUD chuẩn). Phù hợp cho: login, bulk actions, custom business logic endpoints.

---

## API Trả Về (chung cho cả 3)

| Giá trị       | Kiểu                      | Mô tả              |
| ------------- | ------------------------- | ------------------ |
| `call`        | `(params?) => Promise<T>` | Hàm gọi API        |
| `loading`     | `boolean`                 | Đang gửi request   |
| `isCompleted` | `boolean`                 | Request hoàn thành |
| `result`      | `T \| null`               | Kết quả từ API     |
| `error`       | `Error \| null`           | Lỗi nếu có         |
| `reset`       | `() => void`              | Reset trạng thái   |

---

## Implementation Chung (Factory Pattern)

```ts
// src/hooks/useApiCall.ts  ← hook nội bộ, không export ra ngoài
"use client";

import { useState, useCallback } from "react";
import { AxiosInstance } from "axios";
import { getApiClient } from "@/lib/apiClient";

type HttpMethod = "post" | "put" | "delete";

function useApiCall<T = unknown>(method: HttpMethod, endpoint: string) {
  const apiClient = getApiClient();

  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const call = useCallback(
    async (params?: Record<string, unknown>): Promise<T> => {
      setLoading(true);
      setError(null);
      setIsCompleted(false);

      try {
        let res;
        if (method === "delete") {
          res = await apiClient.delete<T>(endpoint, { data: params });
        } else {
          res = await (apiClient[method] as AxiosInstance["post"])<T>(
            endpoint,
            params,
          );
        }

        const data = (res.data as { data?: T }).data ?? res.data;
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
    [apiClient, endpoint, method],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setIsCompleted(false);
    setResult(null);
    setError(null);
  }, []);

  return { call, loading, isCompleted, result, error, reset };
}

export { useApiCall };
```

---

## `usePostCall<T>` — POST Request

```ts
// src/hooks/usePostCall.ts
"use client";
import { useApiCall } from "./useApiCall";

export function usePostCall<T = unknown>(endpoint: string) {
  return useApiCall<T>("post", endpoint);
}
```

## `usePutCall<T>` — PUT Request

```ts
// src/hooks/usePutCall.ts
"use client";
import { useApiCall } from "./useApiCall";

export function usePutCall<T = unknown>(endpoint: string) {
  return useApiCall<T>("put", endpoint);
}
```

## `useDeleteCall<T>` — DELETE Request

```ts
// src/hooks/useDeleteCall.ts
"use client";
import { useApiCall } from "./useApiCall";

export function useDeleteCall<T = unknown>(endpoint: string) {
  return useApiCall<T>("delete", endpoint);
}
```

---

## Cách Sử Dụng

### `usePostCall` — Đăng nhập

```tsx
"use client";
import { usePostCall } from "@/hooks/usePostCall";

interface LoginResponse {
  token: string;
  user: { email: string };
}

export function LoginForm() {
  const { call, loading, error } = usePostCall<LoginResponse>("/auth/login");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await call({
      username: form.get("username") as string,
      password: form.get("password") as string,
    });
    localStorage.setItem("token", res.token);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" />
      <input name="password" type="password" />
      {error && <p>{error.message}</p>}
      <button disabled={loading}>Đăng nhập</button>
    </form>
  );
}
```

### `usePostCall` — Gửi thông báo

```tsx
const { call, loading } = usePostCall("/notifications/send");

await call({
  userId: "user-1",
  message: "Task của bạn sắp đến hạn",
  type: "warning",
});
```

### `usePutCall` — Cập nhật bulk

```tsx
const { call, loading } = usePutCall("/tasks/bulk-update");

await call({
  ids: ["task-1", "task-2", "task-3"],
  data: { status: "done" },
});
```

### `usePutCall` — Theo kiểu frappe-react-sdk

```tsx
// frappe-react-sdk: call.put('frappe.client.set_value', updatedFields)
// Tương đương:
const { call } = usePutCall("/set-value");

await call({
  doctype: "User",
  name: "Administrator",
  fieldname: "bio",
  value: "Hello world",
});
```

### `useDeleteCall` — Xóa bulk

```tsx
const { call, loading } = useDeleteCall("/tasks/bulk-delete");

await call({
  ids: ["task-1", "task-2"],
});
```

---

## Khi Nào Dùng Hook Nào

| Tình huống                       | Hook nên dùng   |
| -------------------------------- | --------------- |
| Tạo 1 document theo pattern CRUD | `useCreateDoc`  |
| Cập nhật 1 document              | `useUpdateDoc`  |
| Xóa 1 document                   | `useDeleteDoc`  |
| Endpoint tùy chỉnh POST          | `usePostCall`   |
| Endpoint tùy chỉnh PUT           | `usePutCall`    |
| Endpoint tùy chỉnh DELETE        | `useDeleteCall` |

---

Tiếp theo: [12-use-file-upload.md](./12-use-file-upload.md)
