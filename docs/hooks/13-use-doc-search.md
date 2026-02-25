# 13. `useDocSearch<T>` — Tìm Kiếm Có Debounce

Tương đương `useFrappeDocSearch` trong frappe-react-sdk.

---

## Mục Đích

Tìm kiếm documents real-time với debounce — không gọi API sau mỗi lần gõ, mà chờ người dùng dừng gõ một khoảng thời gian rồi mới tìm.

**API call:** `GET /{resource}/search?txt=...&filters=...&limit=...`

---

## API Trả Về

| Giá trị        | Kiểu               | Mô tả              |
| -------------- | ------------------ | ------------------ |
| `data`         | `T[] \| undefined` | Kết quả tìm kiếm   |
| `isLoading`    | `boolean`          | Đang fetch lần đầu |
| `isValidating` | `boolean`          | Đang refetch       |
| `error`        | `Error \| null`    | Lỗi nếu có         |

---

## Bước 1: Cài Hook Debounce

```ts
// src/hooks/useDebounce.ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

---

## Bước 2: Implementation `useDocSearch`

```ts
// src/hooks/useDocSearch.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";
import { Filter } from "@/types/hooks";
import { useDebounce } from "./useDebounce";

interface DocSearchArgs {
  /** Điều kiện lọc bổ sung */
  filters?: Filter[];
  /** Số kết quả tối đa. Mặc định: 10 */
  limit?: number;
}

export function useDocSearch<T = Record<string, unknown>>(
  /** Resource cần tìm */
  resource: string,
  /** Chuỗi tìm kiếm (do người dùng nhập) */
  searchText: string,
  /** Điều kiện lọc và giới hạn kết quả */
  args?: DocSearchArgs,
  /** Debounce delay tính bằng ms. Mặc định: 300 */
  debounceMs: number = 300,
) {
  const apiClient = getApiClient();

  // Chờ người dùng dừng gõ mới tìm kiếm
  const debouncedText = useDebounce(searchText, debounceMs);

  const query = useQuery<T[], Error>({
    queryKey: ["search", resource, debouncedText, args],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        txt: debouncedText,
        limit: args?.limit ?? 10,
      };

      if (args?.filters?.length) {
        params.filters = JSON.stringify(args.filters);
      }

      const res = await apiClient.get<T[]>(`/${resource}/search`, { params });
      return (res.data as { data?: T[] }).data ?? res.data;
    },
    // Không gọi API khi search text rỗng
    enabled: debouncedText.trim().length > 0,
    staleTime: 1000 * 10, // cache kết quả 10 giây
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isValidating: query.isFetching,
    error: query.error,
  };
}
```

---

## Cách Sử Dụng

### Search box đơn giản

```tsx
"use client";
import { useState } from "react";
import { useDocSearch } from "@/hooks/useDocSearch";

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserSearch() {
  const [text, setText] = useState("");
  const { data, isValidating } = useDocSearch<User>("users", text);

  return (
    <div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tìm người dùng..."
      />
      {isValidating && <span>Đang tìm...</span>}
      <ul>
        {data?.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Tìm kiếm với filter bổ sung

```tsx
const { data } = useDocSearch<Task>("tasks", searchText, {
  filters: [["boardId", "=", currentBoardId]],
  limit: 5,
});
```

### Debounce dài hơn (tìm kiếm chậm)

```tsx
// Debounce 500ms thay vì 300ms mặc định
const { data } = useDocSearch<Task>("tasks", searchText, undefined, 500);
```

### Search với dropdown suggest

```tsx
"use client";
import { useState, useRef } from "react";
import { useDocSearch } from "@/hooks/useDocSearch";

interface Task {
  id: string;
  title: string;
}

export function TaskSearchInput({
  onSelect,
}: {
  onSelect: (task: Task) => void;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useDocSearch<Task>("tasks", text);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Tìm task..."
      />
      {open && data && data.length > 0 && (
        <ul
          style={{
            position: "absolute",
            background: "white",
            border: "1px solid #ccc",
            width: "100%",
            zIndex: 10,
          }}
        >
          {data.map((task) => (
            <li
              key={task.id}
              onClick={() => {
                onSelect(task);
                setText(task.title);
                setOpen(false);
              }}
              style={{ padding: "8px", cursor: "pointer" }}
            >
              {task.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Global Search (tìm nhiều resource cùng lúc)

```tsx
"use client";
import { useState } from "react";
import { useDocSearch } from "@/hooks/useDocSearch";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const { data: tasks } = useDocSearch("tasks", query, { limit: 3 });
  const { data: boards } = useDocSearch("boards", query, { limit: 3 });
  const { data: users } = useDocSearch("users", query, { limit: 3 });

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {query && (
        <div>
          {tasks?.length ? (
            <section>
              <h4>Tasks</h4>
              {tasks.map((t: any) => (
                <p key={t.id}>{t.title}</p>
              ))}
            </section>
          ) : null}
          {boards?.length ? (
            <section>
              <h4>Boards</h4>
              {boards.map((b: any) => (
                <p key={b.id}>{b.name}</p>
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
```

---

Tiếp theo: [14-index-export.md](./14-index-export.md)
