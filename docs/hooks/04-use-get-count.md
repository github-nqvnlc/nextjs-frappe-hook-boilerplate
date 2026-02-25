# 04. `useGetCount` — Đếm Số Document

Tương đương `useFrappeGetDocCount` trong frappe-react-sdk.

---

## Mục Đích

Đếm số documents thỏa mãn điều kiện filter mà không cần fetch toàn bộ data.

**API call:** `GET /{resource}/count?filters=...`

---

## API Trả Về

| Giá trị        | Kiểu                  | Mô tả                 |
| -------------- | --------------------- | --------------------- |
| `data`         | `number \| undefined` | Số documents đếm được |
| `isLoading`    | `boolean`             | Đang fetch lần đầu    |
| `isValidating` | `boolean`             | Đang refetch          |
| `error`        | `Error \| null`       | Lỗi nếu có            |
| `mutate`       | `() => void`          | Refetch thủ công      |

---

## Implementation

```ts
// src/hooks/useGetCount.ts
"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";
import { Filter } from "@/types/hooks";

type UseGetCountOptions = Omit<
  UseQueryOptions<number, Error>,
  "queryKey" | "queryFn"
>;

export function useGetCount(
  /** Tên resource, vd: 'tasks' */
  resource: string,
  /** Điều kiện lọc (AND) */
  filters?: Filter[],
  /** Bật debug log phía server */
  debug?: boolean,
  /** TanStack Query options */
  options?: UseGetCountOptions,
) {
  const apiClient = getApiClient();

  const queryKey = [resource, "count", filters];

  const query = useQuery<number, Error>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (filters?.length) {
        params.filters = JSON.stringify(filters);
      }
      if (debug) {
        params.debug = 1;
      }

      const res = await apiClient.get<number | { count: number }>(
        `/${resource}/count`,
        { params },
      );

      // Điều chỉnh tuỳ backend trả về số hoặc object
      const raw = res.data;
      return typeof raw === "number"
        ? raw
        : ((raw as { count: number }).count ?? 0);
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

### Đếm tất cả

```tsx
"use client";
import { useGetCount } from "@/hooks/useGetCount";

export function TotalTasks() {
  const { data, isLoading } = useGetCount("tasks");

  if (isLoading) return null;
  return <span>{data} tasks</span>;
}
```

### Đếm với filter

```tsx
const { data: doneCount } = useGetCount("tasks", [["status", "=", "done"]]);
// "12 tasks completed"

const { data: overdueCount } = useGetCount("tasks", [
  ["dueDate", "<", new Date().toISOString()],
  ["status", "!=", "done"],
]);
// "3 tasks overdue"
```

### Nhiều bộ đếm cùng lúc (song song)

```tsx
"use client";
import { useGetCount } from "@/hooks/useGetCount";

export function TaskStats({ boardId }: { boardId: string }) {
  const { data: total } = useGetCount("tasks", [["boardId", "=", boardId]]);
  const { data: done } = useGetCount("tasks", [
    ["boardId", "=", boardId],
    ["status", "=", "done"],
  ]);
  const { data: inProgress } = useGetCount("tasks", [
    ["boardId", "=", boardId],
    ["status", "=", "in_progress"],
  ]);

  return (
    <div>
      <span>Tổng: {total ?? "-"}</span>
      <span>Hoàn thành: {done ?? "-"}</span>
      <span>Đang làm: {inProgress ?? "-"}</span>
    </div>
  );
}
```

### Hiển thị badge số lượng

```tsx
export function ColumnHeader({
  columnId,
  title,
}: {
  columnId: string;
  title: string;
}) {
  const { data: count } = useGetCount("tasks", [["columnId", "=", columnId]]);

  return (
    <div>
      <span>{title}</span>
      {count !== undefined && <span className="badge">{count}</span>}
    </div>
  );
}
```

---

## Lưu Ý

- Hook này rất nhẹ vì chỉ trả về 1 số, phù hợp để dùng trong header/badge mà không ảnh hưởng performance.
- Cache key = `[resource, 'count', filters]` — tự invalidate khi filters thay đổi.
- Nếu backend không có endpoint `/count` riêng, có thể dùng `useGetList` với `limit: 0` và đọc header `X-Total-Count` tùy theo API.

---

Tiếp theo: [05-use-create-doc.md](./05-use-create-doc.md)
