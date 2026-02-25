# 08. `useGetCall<T>` — Gọi GET Endpoint Bất Kỳ

Tương đương `useFrappeGetCall` trong frappe-react-sdk.

---

## Mục Đích

Gọi một GET endpoint tùy chỉnh (không theo pattern resource/id) với query params. Kết quả được cache bởi TanStack Query.

**API call:** `GET /{endpoint}?param1=...&param2=...`

---

## API Trả Về

| Giá trị        | Kiểu             | Mô tả              |
| -------------- | ---------------- | ------------------ |
| `data`         | `T \| undefined` | Kết quả từ API     |
| `isLoading`    | `boolean`        | Đang fetch lần đầu |
| `isValidating` | `boolean`        | Đang refetch       |
| `error`        | `Error \| null`  | Lỗi nếu có         |
| `mutate`       | `() => void`     | Refetch thủ công   |

---

## Implementation

```ts
// src/hooks/useGetCall.ts
"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";

type UseGetCallOptions<T> = Omit<
  UseQueryOptions<T, Error>,
  "queryKey" | "queryFn"
>;

export function useGetCall<T = unknown>(
  /** Endpoint path, vd: '/search', '/reports/summary', '/users/me/stats' */
  endpoint: string,
  /** Query params — object sẽ được serialize thành ?key=value */
  params?: Record<string, unknown>,
  /** TanStack Query options */
  options?: UseGetCallOptions<T>,
) {
  const apiClient = getApiClient();

  const query = useQuery<T, Error>({
    queryKey: ["call", endpoint, params],
    queryFn: async () => {
      const res = await apiClient.get<T>(endpoint, { params });
      return (res.data as { data?: T }).data ?? res.data;
    },
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

### Gọi endpoint tìm kiếm

```tsx
"use client";
import { useGetCall } from "@/hooks/useGetCall";

interface SearchResult {
  id: string;
  title: string;
  type: string;
}

export function GlobalSearch({ query }: { query: string }) {
  const { data, isLoading } = useGetCall<SearchResult[]>(
    "/search",
    {
      q: query,
      limit: 10,
    },
    {
      enabled: query.length >= 2, // chỉ search khi nhập ít nhất 2 ký tự
    },
  );

  return (
    <ul>
      {data?.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
```

### Gọi báo cáo / thống kê

```tsx
const { data: stats } = useGetCall<{
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}>("/reports/board-summary", { boardId });
```

### Gọi endpoint với nhiều params

```tsx
const { data } = useGetCall("/frappe.desk.search_link", {
  doctype: "Currency",
  txt: "IN",
  page_length: 10,
});
```

---

## So Sánh Với `useGetList`

|                      | `useGetList`                    | `useGetCall`                 |
| -------------------- | ------------------------------- | ---------------------------- |
| Pattern endpoint     | `/{resource}?filters=...`       | Endpoint bất kỳ              |
| Serialization params | Chuẩn hóa (filters, orderBy...) | Raw params object            |
| Cache key            | `[resource, 'list', args]`      | `['call', endpoint, params]` |
| Dùng khi             | CRUD chuẩn                      | Endpoint tùy chỉnh           |

---

Tiếp theo: [09-use-post-call.md](./09-use-post-call.md)
