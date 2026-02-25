# 05. `useCreateDoc<T>` — Tạo Document Mới

Tương đương `useFrappeCreateDoc` trong frappe-react-sdk.

---

## Mục Đích

Tạo một document mới qua API và tự động invalidate cache liên quan.

**API call:** `POST /{resource}`

---

## API Trả Về

| Giá trị       | Kiểu                               | Mô tả                       |
| ------------- | ---------------------------------- | --------------------------- |
| `createDoc`   | `(data: Partial<T>) => Promise<T>` | Hàm tạo doc                 |
| `loading`     | `boolean`                          | Đang gửi request            |
| `isCompleted` | `boolean`                          | Request đã thành công       |
| `result`      | `T \| null`                        | Document vừa tạo            |
| `error`       | `Error \| null`                    | Lỗi nếu có                  |
| `reset`       | `() => void`                       | Reset về trạng thái ban đầu |

---

## Implementation

```ts
// src/hooks/useCreateDoc.ts
"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";

export function useCreateDoc<T = Record<string, unknown>>(
  /** Tên resource, vd: 'tasks', 'boards' */
  resource: string,
) {
  const apiClient = getApiClient();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const createDoc = useCallback(
    async (data: Partial<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      setIsCompleted(false);

      try {
        const res = await apiClient.post<T>(`/${resource}`, data);
        const doc = (res.data as { data?: T }).data ?? res.data;

        setResult(doc);
        setIsCompleted(true);

        // Invalidate list cache để UI tự cập nhật
        queryClient.invalidateQueries({ queryKey: [resource, "list"] });
        queryClient.invalidateQueries({ queryKey: [resource, "count"] });

        return doc;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, queryClient, resource],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setIsCompleted(false);
    setResult(null);
    setError(null);
  }, []);

  return { createDoc, loading, isCompleted, result, error, reset };
}
```

---

## Cách Sử Dụng

### Form tạo task đơn giản

```tsx
"use client";
import { useCreateDoc } from "@/hooks/useCreateDoc";

interface Task {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  columnId: string;
}

export function CreateTaskForm({ columnId }: { columnId: string }) {
  const { createDoc, loading, error, reset } = useCreateDoc<Task>("tasks");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      const task = await createDoc({
        title: form.get("title") as string,
        priority: form.get("priority") as Task["priority"],
        columnId,
      });
      console.log("Task đã tạo:", task.id);
      (e.target as HTMLFormElement).reset();
      reset();
    } catch {
      // error đã được set trong hook
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Tên task" required />
      <select name="priority">
        <option value="low">Thấp</option>
        <option value="medium">Trung bình</option>
        <option value="high">Cao</option>
      </select>
      {error && <p className="text-red-500">{error.message}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Đang tạo..." : "Tạo task"}
      </button>
    </form>
  );
}
```

### Hiển thị trạng thái sau khi tạo

```tsx
const { createDoc, isCompleted, result, reset } = useCreateDoc<Task>("tasks");

if (isCompleted && result) {
  return (
    <div>
      <p>Đã tạo task: {result.title}</p>
      <button onClick={reset}>Tạo thêm</button>
    </div>
  );
}
```

### Tạo rồi redirect

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useCreateDoc } from "@/hooks/useCreateDoc";

export function CreateBoardButton() {
  const { createDoc, loading } = useCreateDoc<{ id: string }>("boards");
  const router = useRouter();

  async function handleCreate() {
    const board = await createDoc({ name: "Board mới" });
    router.push(`/boards/${board.id}`);
  }

  return (
    <button onClick={handleCreate} disabled={loading}>
      {loading ? "..." : "+ Tạo Board"}
    </button>
  );
}
```

---

Tiếp theo: [06-use-update-doc.md](./06-use-update-doc.md)
