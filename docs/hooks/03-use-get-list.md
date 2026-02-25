# 03. `useGetList<T>` — Lấy Danh Sách Document

Tương đương `useFrappeGetDocList` trong frappe-react-sdk.

---

## Mục Đích

Fetch danh sách documents với đầy đủ tùy chọn: filter, sort, phân trang, chọn fields.

**API call:** `GET /{resource}?fields=...&filters=...&limit=...&offset=...`

---

## API Trả Về

| Giá trị        | Kiểu               | Mô tả              |
| -------------- | ------------------ | ------------------ |
| `data`         | `T[] \| undefined` | Mảng documents     |
| `isLoading`    | `boolean`          | Đang fetch lần đầu |
| `isValidating` | `boolean`          | Đang refetch       |
| `error`        | `Error \| null`    | Lỗi nếu có         |
| `mutate`       | `() => void`       | Refetch thủ công   |

---

## Implementation

```ts
// src/hooks/useGetList.ts
"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";
import { Filter, GetListArgs } from "@/types/hooks";

/** Chuyển filters array thành query string */
function serializeFilters(filters: Filter[]): string {
  return JSON.stringify(filters);
}

type UseGetListOptions<T> = Omit<
  UseQueryOptions<T[], Error>,
  "queryKey" | "queryFn"
>;

export function useGetList<T = Record<string, unknown>>(
  /** Tên resource, vd: 'tasks', 'boards' */
  resource: string,
  /** Điều kiện lọc, sắp xếp, phân trang */
  args?: GetListArgs<T>,
  /** TanStack Query options */
  options?: UseGetListOptions<T>,
) {
  const apiClient = getApiClient();

  const queryKey = [resource, "list", args];

  const query = useQuery<T[], Error>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (args?.fields?.length) {
        params.fields = JSON.stringify(args.fields);
      }
      if (args?.filters?.length) {
        params.filters = serializeFilters(args.filters);
      }
      if (args?.orFilters?.length) {
        params.or_filters = serializeFilters(args.orFilters);
      }
      if (args?.limit_start !== undefined) {
        params.limit_start = args.limit_start;
      }
      if (args?.limit !== undefined) {
        params.limit = args.limit;
      } else {
        params.limit = 20; // mặc định
      }
      if (args?.orderBy) {
        params.order_by = `${args.orderBy.field} ${args.orderBy.order}`;
      }
      if (args?.asDict) {
        params.as_dict = 1;
      }

      const res = await apiClient.get<T[]>(`/${resource}`, { params });

      // Điều chỉnh theo format response của backend
      return (res.data as { data?: T[] }).data ?? res.data;
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

### Cơ bản — lấy tất cả

```tsx
"use client";
import { useGetList } from "@/hooks/useGetList";

interface Task {
  id: string;
  title: string;
  priority: string;
}

export function TaskList() {
  const { data, isLoading, error } = useGetList<Task>("tasks");

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi: {error.message}</p>;

  return (
    <ul>
      {data?.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

### Chỉ lấy một số fields

```tsx
const { data } = useGetList<{ id: string; title: string }>("tasks", {
  fields: ["id", "title"],
});
```

### Filter (AND — tất cả điều kiện phải đúng)

```tsx
const { data } = useGetList<Task>("tasks", {
  filters: [
    ["priority", "=", "high"],
    ["dueDate", "<", "2025-12-31"],
  ],
});
```

### Filter (OR — ít nhất 1 điều kiện đúng)

```tsx
const { data } = useGetList<Task>("tasks", {
  orFilters: [
    ["assigneeId", "=", "user-1"],
    ["assigneeId", "=", "user-2"],
  ],
});
```

### Phân trang

```tsx
"use client";
import { useState } from "react";
import { useGetList } from "@/hooks/useGetList";

const PAGE_SIZE = 10;

export function PaginatedTaskList() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useGetList<Task>("tasks", {
    limit_start: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    orderBy: { field: "createdAt", order: "desc" },
  });

  return (
    <div>
      <ul>
        {data?.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
      <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
        Trước
      </button>
      <button onClick={() => setPage((p) => p + 1)}>Sau</button>
    </div>
  );
}
```

### Sort kết quả

```tsx
const { data } = useGetList<Task>("tasks", {
  orderBy: { field: "dueDate", order: "asc" },
});
```

### Kết hợp tất cả options

```tsx
const { data, isLoading } = useGetList<Task>("tasks", {
  fields: ["id", "title", "priority", "assigneeId"],
  filters: [["columnId", "=", "col-1"]],
  orFilters: [
    ["priority", "=", "high"],
    ["priority", "=", "urgent"],
  ],
  limit_start: 0,
  limit: 10,
  orderBy: { field: "order", order: "asc" },
});
```

### Disable fetch tạm thời

```tsx
const { data } = useGetList<Task>("tasks", args, {
  enabled: isReady, // chỉ fetch khi isReady = true
});
```

---

## Kết Hợp Với Filter UI

```tsx
"use client";
import { useState } from "react";
import { useGetList } from "@/hooks/useGetList";
import { Filter } from "@/types/hooks";

export function FilterableTaskList() {
  const [priority, setPriority] = useState<string | null>(null);

  const filters: Filter[] = [];
  if (priority) filters.push(["priority", "=", priority]);

  const { data, isLoading } = useGetList<Task>("tasks", { filters });

  return (
    <div>
      <select onChange={(e) => setPriority(e.target.value || null)}>
        <option value="">Tất cả</option>
        <option value="high">Cao</option>
        <option value="medium">Trung bình</option>
        <option value="low">Thấp</option>
      </select>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {data?.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

Tiếp theo: [04-use-get-count.md](./04-use-get-count.md)
