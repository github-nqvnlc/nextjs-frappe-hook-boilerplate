# 07. `useDeleteDoc` — Xóa Document

Tương đương `useFrappeDeleteDoc` trong frappe-react-sdk.

---

## Mục Đích

Xóa một document theo ID. Sau khi xóa thành công, tự động xóa document khỏi cache và invalidate danh sách.

**API call:** `DELETE /{resource}/{id}`

---

## API Trả Về

| Giá trị       | Kiểu                                           | Mô tả                               |
| ------------- | ---------------------------------------------- | ----------------------------------- |
| `deleteDoc`   | `(id: string) => Promise<{ message: string }>` | Hàm xóa. Trả về `{ message: 'ok' }` |
| `loading`     | `boolean`                                      | Đang gửi request                    |
| `isCompleted` | `boolean`                                      | Đã xóa thành công                   |
| `error`       | `Error \| null`                                | Lỗi nếu có                          |
| `reset`       | `() => void`                                   | Reset về trạng thái ban đầu         |

---

## Implementation

```ts
// src/hooks/useDeleteDoc.ts
"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/apiClient";

export function useDeleteDoc(
  /** Tên resource */
  resource: string,
) {
  const apiClient = getApiClient();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteDoc = useCallback(
    async (id: string): Promise<{ message: string }> => {
      setLoading(true);
      setError(null);
      setIsCompleted(false);

      try {
        const res = await apiClient.delete<{ message: string }>(
          `/${resource}/${id}`,
        );

        setIsCompleted(true);

        // Xoá document khỏi cache ngay lập tức
        queryClient.removeQueries({ queryKey: [resource, id] });
        // Invalidate list để re-fetch danh sách
        queryClient.invalidateQueries({ queryKey: [resource, "list"] });
        queryClient.invalidateQueries({ queryKey: [resource, "count"] });

        return res.data ?? { message: "ok" };
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
    setError(null);
  }, []);

  return { deleteDoc, loading, isCompleted, error, reset };
}
```

---

## Cách Sử Dụng

### Nút xóa đơn giản

```tsx
"use client";
import { useDeleteDoc } from "@/hooks/useDeleteDoc";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const { deleteDoc, loading } = useDeleteDoc("tasks");

  async function handleDelete() {
    if (!confirm("Bạn có chắc muốn xóa?")) return;
    await deleteDoc(taskId);
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-red-500">
      {loading ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
```

### Xóa + redirect

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useDeleteDoc } from "@/hooks/useDeleteDoc";

export function DeleteBoardButton({ boardId }: { boardId: string }) {
  const { deleteDoc, loading } = useDeleteDoc("boards");
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Xóa board này? Tất cả task bên trong cũng sẽ bị xóa."))
      return;
    await deleteDoc(boardId);
    router.push("/boards"); // redirect sau khi xóa
  }

  return (
    <button onClick={handleDelete} disabled={loading}>
      {loading ? "..." : "Xóa Board"}
    </button>
  );
}
```

### Xóa với xác nhận kép (dialog)

```tsx
"use client";
import { useState } from "react";
import { useDeleteDoc } from "@/hooks/useDeleteDoc";

export function DeleteWithConfirmation({
  taskId,
  taskTitle,
}: {
  taskId: string;
  taskTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const { deleteDoc, loading, error } = useDeleteDoc("tasks");

  async function handleConfirm() {
    await deleteDoc(taskId);
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}>Xóa</button>

      {open && (
        <div className="modal">
          <p>
            Xóa task "<strong>{taskTitle}</strong>"?
          </p>
          {error && <p className="text-red-500">{error.message}</p>}
          <button onClick={() => setOpen(false)}>Hủy</button>
          <button onClick={handleConfirm} disabled={loading}>
            {loading ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      )}
    </>
  );
}
```

### Xóa nhiều items (bulk delete)

```tsx
export function BulkDeleteButton({ selectedIds }: { selectedIds: string[] }) {
  const { deleteDoc, loading } = useDeleteDoc("tasks");
  const [deleting, setDeleting] = useState(false);

  async function handleBulkDelete() {
    setDeleting(true);
    try {
      // Xóa tuần tự để tránh quá tải API
      for (const id of selectedIds) {
        await deleteDoc(id);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button onClick={handleBulkDelete} disabled={deleting}>
      Xóa {selectedIds.length} task
    </button>
  );
}
```

---

## Lưu Ý

- `deleteDoc` trả về `{ message: 'ok' }` khi thành công (giống frappe-react-sdk).
- Cache của document bị xóa sẽ được `removeQueries` — không chỉ invalidate, mà xóa hẳn khỏi bộ nhớ.
- Nên hiện confirm dialog trước khi xóa để tránh xóa nhầm.

---

Tiếp theo: [08-use-get-call.md](./08-use-get-call.md)
