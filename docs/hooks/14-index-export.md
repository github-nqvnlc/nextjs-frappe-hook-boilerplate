# 14. `index.ts` — Export Tất Cả Hooks

File này là entry point duy nhất để import hooks trong toàn bộ ứng dụng.

---

## Implementation

```ts
// src/hooks/index.ts

// Provider
export { ApiProvider } from "@/lib/ApiProvider";

// Auth
export { useAuth } from "./useAuth";

// Database — Read
export { useGetDoc } from "./useGetDoc";
export { useGetList } from "./useGetList";
export { useGetCount } from "./useGetCount";

// Database — Write
export { useCreateDoc } from "./useCreateDoc";
export { useUpdateDoc } from "./useUpdateDoc";
export { useDeleteDoc } from "./useDeleteDoc";

// API Calls
export { useGetCall } from "./useGetCall";
export { usePostCall } from "./usePostCall";
export { usePutCall } from "./usePutCall";
export { useDeleteCall } from "./useDeleteCall";

// File
export { useFileUpload } from "./useFileUpload";

// Search
export { useDocSearch } from "./useDocSearch";

// Utils
export { useDebounce } from "./useDebounce";
```

---

## Cách Import Trong Component

```tsx
// Thay vì import từng file riêng lẻ:
import { useGetDoc } from "@/hooks/useGetDoc";
import { useUpdateDoc } from "@/hooks/useUpdateDoc";

// Chỉ cần import từ một chỗ:
import { useGetDoc, useUpdateDoc, useAuth } from "@/hooks";
```

---

## Checklist Cấu Trúc File Hoàn Chỉnh

```
src/
├── types/
│   └── hooks.ts              ✅ Filter, GetListArgs, TokenParams, UploadArgs
│
├── lib/
│   ├── auth.ts               ✅ getToken, setToken, clearToken
│   ├── apiClient.ts          ✅ axios instance + interceptors
│   └── ApiProvider.tsx       ✅ Context + QueryClientProvider
│
└── hooks/
    ├── index.ts              ✅ Export tập trung
    ├── useDebounce.ts        ✅ Utility hook
    ├── useAuth.ts            ✅ Login/Logout/currentUser
    ├── useGetDoc.ts          ✅ GET /{resource}/{id}
    ├── useGetList.ts         ✅ GET /{resource}?...
    ├── useGetCount.ts        ✅ GET /{resource}/count
    ├── useCreateDoc.ts       ✅ POST /{resource}
    ├── useUpdateDoc.ts       ✅ PATCH /{resource}/{id}
    ├── useDeleteDoc.ts       ✅ DELETE /{resource}/{id}
    ├── useApiCall.ts         ✅ Internal factory (không export)
    ├── useGetCall.ts         ✅ GET custom endpoint
    ├── usePostCall.ts        ✅ POST custom endpoint
    ├── usePutCall.ts         ✅ PUT custom endpoint
    ├── useDeleteCall.ts      ✅ DELETE custom endpoint
    ├── useFileUpload.ts      ✅ POST /upload (multipart)
    └── useDocSearch.ts       ✅ GET /{resource}/search (debounced)
```

---

## Ví Dụ Toàn Diện — Trang Quản Lý Task

```tsx
"use client";
import {
  useGetList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  useDocSearch,
  useAuth,
} from "@/hooks";

interface Task {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
}

export default function TaskPage({ boardId }: { boardId: string }) {
  const { currentUser } = useAuth();
  const { data: tasks, isLoading } = useGetList<Task>("tasks", {
    filters: [["boardId", "=", boardId]],
    orderBy: { field: "createdAt", order: "asc" },
  });
  const { createDoc } = useCreateDoc<Task>("tasks");
  const { updateDoc } = useUpdateDoc<Task>("tasks");
  const { deleteDoc } = useDeleteDoc("tasks");
  const [searchText, setSearchText] = useState("");
  const { data: searchResults } = useDocSearch<Task>("tasks", searchText, {
    filters: [["boardId", "=", boardId]],
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <p>Xin chào, {currentUser}</p>
      <input
        placeholder="Tìm task..."
        onChange={(e) => setSearchText(e.target.value)}
      />
      <ul>
        {(searchText ? searchResults : tasks)?.map((task) => (
          <li key={task.id}>
            {task.title}
            <button onClick={() => updateDoc(task.id, { status: "done" })}>
              Hoàn thành
            </button>
            <button onClick={() => deleteDoc(task.id)}>Xóa</button>
          </li>
        ))}
      </ul>
      <button onClick={() => createDoc({ title: "Task mới", boardId })}>
        + Thêm Task
      </button>
    </div>
  );
}
```

---

## Tổng Kết

Bộ hooks này cung cấp **y hệt trải nghiệm của frappe-react-sdk** nhưng:

- ✅ Không phụ thuộc vào Frappe Framework
- ✅ Dùng với bất kỳ REST API nào
- ✅ TypeScript đầy đủ, type-safe
- ✅ Tương thích Next.js App Router (Client Components)
- ✅ Cache thông minh với TanStack Query
- ✅ Optimistic update ready
