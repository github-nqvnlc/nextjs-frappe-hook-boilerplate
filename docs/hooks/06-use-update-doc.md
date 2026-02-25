# 06. `useUpdateDoc<T>` — Cập Nhật Document

Tương đương `useFrappeUpdateDoc` trong frappe-react-sdk.

---

## Mục Đích

Cập nhật một hoặc nhiều field của document đã có. Sau khi update thành công, tự động invalidate cache để UI hiển thị data mới.

**API call:** `PUT /{resource}/{id}` hoặc `PATCH /{resource}/{id}`

---

## API Trả Về

| Giá trị       | Kiểu                                           | Mô tả                       |
| ------------- | ---------------------------------------------- | --------------------------- |
| `updateDoc`   | `(id: string, data: Partial<T>) => Promise<T>` | Hàm cập nhật                |
| `loading`     | `boolean`                                      | Đang gửi request            |
| `isCompleted` | `boolean`                                      | Request đã thành công       |
| `result`      | `T \| null`                                    | Document sau khi cập nhật   |
| `error`       | `Error \| null`                                | Lỗi nếu có                  |
| `reset`       | `() => void`                                   | Reset về trạng thái ban đầu |

---

## Implementation

```ts
// src/hooks/useUpdateDoc.ts
"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";

export function useUpdateDoc<T = Record<string, unknown>>(
  /** Tên resource */
  resource: string,
  /** Method HTTP: PUT (thay toàn bộ) hoặc PATCH (thay một phần). Mặc định: PATCH */
  method: "PUT" | "PATCH" = "PATCH",
) {
  const apiClient = getApiClient();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const updateDoc = useCallback(
    async (id: string, data: Partial<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      setIsCompleted(false);

      try {
        const res =
          method === "PATCH"
            ? await apiClient.patch<T>(`/${resource}/${id}`, data)
            : await apiClient.put<T>(`/${resource}/${id}`, data);

        const doc = (res.data as { data?: T }).data ?? res.data;

        setResult(doc);
        setIsCompleted(true);

        // Invalidate cache của document cụ thể và danh sách
        queryClient.invalidateQueries({ queryKey: [resource, id] });
        queryClient.invalidateQueries({ queryKey: [resource, "list"] });

        return doc;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, queryClient, resource, method],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setIsCompleted(false);
    setResult(null);
    setError(null);
  }, []);

  return { updateDoc, loading, isCompleted, result, error, reset };
}
```

---

## Cách Sử Dụng

### Cập nhật đơn giản

```tsx
"use client";
import { useUpdateDoc } from "@/hooks/useUpdateDoc";

interface Task {
  id: string;
  title: string;
  priority: string;
}

export function EditTaskTitle({ task }: { task: Task }) {
  const { updateDoc, loading, error } = useUpdateDoc<Task>("tasks");

  async function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (e.target.value === task.title) return;
    await updateDoc(task.id, { title: e.target.value });
  }

  return (
    <div>
      <input defaultValue={task.title} onBlur={handleBlur} />
      {loading && <span>Đang lưu...</span>}
      {error && <span>Lỗi: {error.message}</span>}
    </div>
  );
}
```

### Cập nhật nhiều field cùng lúc

```tsx
const { updateDoc } = useUpdateDoc<Task>("tasks");

await updateDoc(taskId, {
  title: "Tên mới",
  priority: "high",
  dueDate: "2025-12-31",
});
```

### Toggle trạng thái (done/undone)

```tsx
export function TaskCheckbox({ task }: { task: Task }) {
  const { updateDoc, loading } = useUpdateDoc<Task>("tasks");

  return (
    <input
      type="checkbox"
      checked={task.status === "done"}
      disabled={loading}
      onChange={() =>
        updateDoc(task.id, {
          status: task.status === "done" ? "todo" : "done",
        })
      }
    />
  );
}
```

### Form chỉnh sửa đầy đủ

```tsx
export function EditTaskForm({ task }: { task: Task }) {
  const { updateDoc, loading, isCompleted, error, reset } =
    useUpdateDoc<Task>("tasks");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await updateDoc(task.id, {
      title: form.get("title") as string,
      priority: form.get("priority") as string,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" defaultValue={task.title} />
      <select name="priority" defaultValue={task.priority}>
        <option value="low">Thấp</option>
        <option value="medium">Trung bình</option>
        <option value="high">Cao</option>
      </select>
      {error && <p>{error.message}</p>}
      {isCompleted && <p>Đã lưu ✓</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
```

---

## Điều Chỉnh Theo Backend

- Dùng `PATCH` nếu backend hỗ trợ partial update (chỉ gửi field cần thay).
- Dùng `PUT` nếu backend yêu cầu gửi toàn bộ object.
- Thay đổi `method` khi khởi tạo: `useUpdateDoc<Task>('tasks', 'PUT')`.

---

Tiếp theo: [07-use-delete-doc.md](./07-use-delete-doc.md)
