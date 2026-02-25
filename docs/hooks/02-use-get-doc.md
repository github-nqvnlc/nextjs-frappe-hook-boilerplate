# 02. `useGetDoc<T>` — Lấy 1 Document Theo ID

Tương đương `useFrappeGetDoc` trong frappe-react-sdk.

---

## Mục Đích

Fetch một document cụ thể từ API theo `resource` và `id`. Kết quả được cache tự động bởi TanStack Query.

**API call:** `GET /{resource}/{id}`

---

## API Trả Về

| Giá trị        | Kiểu             | Mô tả                              |
| -------------- | ---------------- | ---------------------------------- |
| `data`         | `T \| undefined` | Document đã fetch                  |
| `isLoading`    | `boolean`        | Đang fetch lần đầu (chưa có cache) |
| `isValidating` | `boolean`        | Đang refetch trong background      |
| `error`        | `Error \| null`  | Lỗi nếu xảy ra                     |
| `mutate`       | `() => void`     | Refetch thủ công                   |

---

## Implementation

```ts
// src/hooks/useGetDoc.ts
"use client";

import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";

type UseGetDocOptions<T> = Omit<
  UseQueryOptions<T, Error>,
  "queryKey" | "queryFn"
>;

export function useGetDoc<T = Record<string, unknown>>(
  /** Tên resource, vd: 'tasks', 'users', 'boards' */
  resource: string,
  /** ID của document. Truyền undefined/null để tạm thời disable fetch */
  id: string | undefined | null,
  /** TanStack Query options (staleTime, enabled, ...) */
  options?: UseGetDocOptions<T>,
) {
  const apiClient = getApiClient();

  const query = useQuery<T, Error>({
    queryKey: [resource, id],
    queryFn: async () => {
      const res = await apiClient.get<T>(`/${resource}/${id}`);
      // Điều chỉnh nếu backend bọc response trong { data: ... }
      return (res.data as { data?: T }).data ?? res.data;
    },
    // Chỉ fetch khi id có giá trị
    enabled: !!id && options?.enabled !== false,
    ...options,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isValidating: query.isFetching,
    error: query.error,
    mutate: query.refetch,
  };
}
```

---

## Cách Sử Dụng

### Cơ bản

```tsx
"use client";
import { useGetDoc } from "@/hooks/useGetDoc";

interface Task {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  dueDate?: string;
}

export function TaskDetail({ taskId }: { taskId: string }) {
  const { data, isLoading, error, mutate } = useGetDoc<Task>("tasks", taskId);

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi: {error.message}</p>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.title}</h1>
      <span>{data.priority}</span>
      <button onClick={() => mutate()}>Tải lại</button>
    </div>
  );
}
```

### Với custom staleTime

```tsx
const { data } = useGetDoc<User>("users", userId, {
  staleTime: 1000 * 60 * 10, // cache 10 phút
});
```

### Chờ ID trước khi fetch

```tsx
// id có thể undefined khi lần đầu render
const { data } = useGetDoc<Board>("boards", boardId ?? undefined);
// Hook sẽ không fetch cho đến khi boardId có giá trị
```

### Với SWR-style mutate và revalidate

```tsx
const { data, mutate } = useGetDoc<Task>("tasks", taskId);

async function handleUpdate() {
  await apiClient.patch(`/tasks/${taskId}`, { title: "Updated" });
  mutate(); // refetch để sync data mới nhất
}
```

---

## Cache & Invalidation

TanStack Query cache theo `queryKey = [resource, id]`. Để invalidate từ bên ngoài:

```ts
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

// Invalidate 1 document cụ thể
queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });

// Invalidate toàn bộ tasks
queryClient.invalidateQueries({ queryKey: ["tasks"] });
```

---

## Điều Chỉnh Theo Backend

Nếu backend trả về `{ data: {...} }`:

```ts
return (res.data as { data?: T }).data ?? res.data;
```

Nếu backend trả thẳng object:

```ts
return res.data;
```

Nếu backend trả `{ message: {...} }` (kiểu Frappe):

```ts
return (res.data as { message?: T }).message ?? res.data;
```

---

Tiếp theo: [03-use-get-list.md](./03-use-get-list.md)
