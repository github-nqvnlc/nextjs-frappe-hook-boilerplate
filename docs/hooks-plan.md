# 🪝 Kế Hoạch: Custom React Hook Library (Replicate frappe-react-sdk)

## Mục tiêu

Xây dựng **bộ React hooks hoàn chỉnh** có tính năng **y hệt frappe-react-sdk** nhưng kết nối vào bất kỳ REST API nào thay vì Frappe Framework. Hooks được đặt trong `src/hooks/` và export từ một entry point duy nhất.

---

## So Sánh Tính Năng frappe-react-sdk → Bộ Hook Mới

| frappe-react-sdk       | Hook mới        | Mô tả                                   |
| ---------------------- | --------------- | --------------------------------------- |
| `FrappeProvider`       | `ApiProvider`   | Context provider bọc ứng dụng           |
| `useFrappeAuth`        | `useAuth`       | Quản lý trạng thái đăng nhập            |
| `useFrappeGetDoc`      | `useGetDoc`     | Lấy 1 document theo ID                  |
| `useFrappeGetDocList`  | `useGetList`    | Lấy danh sách có filter/sort/phân trang |
| `useFrappeGetDocCount` | `useGetCount`   | Đếm số document theo filter             |
| `useFrappeCreateDoc`   | `useCreateDoc`  | Tạo document mới                        |
| `useFrappeUpdateDoc`   | `useUpdateDoc`  | Cập nhật document                       |
| `useFrappeDeleteDoc`   | `useDeleteDoc`  | Xóa document                            |
| `useFrappeGetCall`     | `useGetCall`    | Gọi GET endpoint bất kỳ                 |
| `useFrappePostCall`    | `usePostCall`   | Gọi POST endpoint bất kỳ                |
| `useFrappePutCall`     | `usePutCall`    | Gọi PUT endpoint bất kỳ                 |
| `useFrappeDeleteCall`  | `useDeleteCall` | Gọi DELETE endpoint bất kỳ              |
| `useFrappeFileUpload`  | `useFileUpload` | Upload file + progress tracking         |
| `useFrappeDocSearch`   | `useDocSearch`  | Tìm kiếm document (debounced)           |

---

## 1. 🏗️ Nền Tảng — `ApiProvider` & `apiClient`

### `ApiProvider` (thay thế `FrappeProvider`)

```tsx
// Dùng trong layout.tsx hoặc _app.tsx
<ApiProvider
  url="https://api.your-backend.com"
  tokenParams={{
    useToken: true,
    token: () => localStorage.getItem("token") ?? "",
    type: "Bearer", // hoặc 'token'
  }}
>
  <App />
</ApiProvider>
```

### `apiClient` internal (axios instance)

- Tự động gắn `Authorization` header từ tokenParams
- Xử lý lỗi 401 → clear token + redirect login
- Timeout 10s mặc định

---

## 2. 🔐 `useAuth` — Xác thực

```tsx
const {
  currentUser, // string | null — email/username user hiện tại
  isValidating, // boolean
  isLoading, // boolean
  login, // (username, password) => Promise<void>
  logout, // () => Promise<void>
  error, // Error | null
  updateCurrentUser, // () => void — refetch thủ công
  getUserCookie, // () => void — reset auth state
} = useAuth();
```

**Hành vi:**

- Tự gọi `GET /auth/me` (hoặc endpoint tương đương) khi mount
- Không gọi API nếu chưa có token
- Khi nhận 403 → set `currentUser = null`

---

## 3. 📄 `useGetDoc<T>` — Lấy 1 Document

```tsx
const {
  data, // T | undefined
  error, // Error | null
  isValidating, // boolean
  mutate, // () => void — refetch thủ công
} = useGetDoc<Task>("tasks", taskId, {
  /** TanStack Query options (optional) **/
  staleTime: 30_000,
  enabled: !!taskId,
});
```

**API call:** `GET /{resource}/{id}`

---

## 4. 📋 `useGetList<T>` — Lấy Danh Sách

```tsx
const { data, error, isValidating, mutate } = useGetList<Task>(
  "tasks",
  {
    /** Fields to fetch — optional */
    fields: ["id", "title", "priority"],
    /** Filters — AND condition */
    filters: [
      ["priority", "=", "high"],
      ["dueDate", "<", "2025-01-01"],
    ],
    /** Filters — OR condition */
    orFilters: [["assigneeId", "=", userId]],
    /** Pagination: skip n results */
    limit_start: 0,
    /** Số docs mỗi trang. Default: 20 */
    limit: 10,
    /** Sắp xếp */
    orderBy: { field: "createdAt", order: "desc" },
    /** Trả về dạng dictionary key-value */
    asDict: false,
  } /** TanStack Query options - optional **/,
);
```

**API call:** `GET /{resource}?fields=...&filters=...&limit=...`

---

## 5. 🔢 `useGetCount` — Đếm Document

```tsx
const {
  data,        // number
  error,
  isValidating,
  mutate,
} = useGetCount('tasks', [
  ['status', '=', 'done'],
  ['assigneeId', '=', userId],
], /** debug: boolean = false */, /** TanStack Query options **/);
```

**API call:** `GET /{resource}/count?filters=...`

---

## 6. ➕ `useCreateDoc<T>` — Tạo Document

```tsx
const {
  createDoc, // (data: Partial<T>) => Promise<T>
  loading, // boolean
  isCompleted, // boolean
  result, // T | null — kết quả sau khi tạo
  error, // Error | null
  reset, // () => void — reset về trạng thái ban đầu
} = useCreateDoc<Task>("tasks");

// Sử dụng:
const task = await createDoc({ title: "New task", priority: "high" });
```

**API call:** `POST /{resource}`

---

## 7. ✏️ `useUpdateDoc<T>` — Cập Nhật Document

```tsx
const {
  updateDoc, // (id: string, data: Partial<T>) => Promise<T>
  loading,
  isCompleted,
  result,
  error,
  reset,
} = useUpdateDoc<Task>("tasks");

await updateDoc(taskId, { priority: "low", title: "Updated" });
```

**API call:** `PUT /{resource}/{id}` hoặc `PATCH /{resource}/{id}`

---

## 8. 🗑️ `useDeleteDoc` — Xóa Document

```tsx
const {
  deleteDoc, // (id: string) => Promise<{ message: 'ok' }>
  loading,
  isCompleted,
  error,
  reset,
} = useDeleteDoc("tasks");

await deleteDoc(taskId);
// response.message === 'ok'
```

**API call:** `DELETE /{resource}/{id}`

---

## 9. 📡 `useGetCall<T>` — Gọi GET Endpoint Bất Kỳ

```tsx
const { data, error, isValidating, mutate } = useGetCall<SearchResult[]>(
  "/search",
  {
    q: "keyword",
    limit: 10,
  },
);
```

**API call:** `GET /{endpoint}?params...`

---

## 10. 📡 `usePostCall<T>` — Gọi POST Endpoint Bất Kỳ

```tsx
const {
  call, // (params) => Promise<T>
  loading,
  result,
  error,
  isCompleted,
  reset,
} = usePostCall<LoginResponse>("/auth/login");

const res = await call({ username: "admin", password: "123" });
```

---

## 11. 📡 `usePutCall<T>` & `useDeleteCall<T>`

Tương tự `usePostCall` nhưng dùng method PUT và DELETE.

```tsx
const { call } = usePutCall("/tasks/bulk-update");
const { call } = useDeleteCall("/tasks/bulk-delete");
```

---

## 12. 📤 `useFileUpload` — Upload File + Progress

```tsx
const {
  upload, // (file: File, args: UploadArgs) => Promise<FileResponse>
  loading, // boolean
  progress, // number (0–100)
  error,
  isCompleted,
  result,
  reset,
} = useFileUpload();

await upload(
  file,
  {
    isPrivate: true, // file private hay public
    folder: "Home", // folder đích
    doctype: "Task", // doctype liên kết
    docname: taskId, // id doc liên kết
    fieldname: "attachment", // field trong doc
  },
  (completed, total) => {
    console.log(`${Math.round((completed / total) * 100)}%`);
  },
);
```

**API call:** `POST /upload` (multipart/form-data)

---

## 13. 🔍 `useDocSearch<T>` — Tìm Kiếm (Debounced)

```tsx
const {
  data, // T[]
  isValidating,
  error,
} = useDocSearch<Task>(
  "tasks",
  searchText,
  {
    filters: [["status", "!=", "archived"]],
    limit: 10,
  } /** debounceMs = 300 **/,
);
```

**Hành vi:** Debounce 300ms, không gọi API khi `searchText` rỗng.

---

## Cấu Trúc File

```
src/
├── hooks/
│   ├── index.ts            ← export tất cả public hooks
│   ├── useAuth.ts
│   ├── useGetDoc.ts
│   ├── useGetList.ts
│   ├── useGetCount.ts
│   ├── useCreateDoc.ts
│   ├── useUpdateDoc.ts
│   ├── useDeleteDoc.ts
│   ├── useGetCall.ts
│   ├── usePostCall.ts
│   ├── usePutCall.ts
│   ├── useDeleteCall.ts
│   ├── useFileUpload.ts
│   └── useDocSearch.ts
├── lib/
│   ├── apiClient.ts        ← axios instance + interceptors
│   ├── ApiProvider.tsx     ← React context provider
│   └── auth.ts             ← token get/set/clear
└── types/
    └── hooks.ts            ← Filter, OrderBy, GetListArgs, UploadArgs...
```

---

## Types Chính

```ts
// types/hooks.ts

export type FilterOperator =
  | "="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">="
  | "like"
  | "in"
  | "not in";
export type Filter = [field: string, operator: FilterOperator, value: unknown];

export interface GetListArgs {
  fields?: string[];
  filters?: Filter[];
  orFilters?: Filter[];
  limit_start?: number;
  limit?: number;
  orderBy?: { field: string; order: "asc" | "desc" };
  asDict?: boolean;
}

export interface UploadArgs {
  isPrivate?: boolean;
  folder?: string;
  file_url?: string;
  doctype?: string;
  docname?: string;
  fieldname?: string;
}

export interface TokenParams {
  useToken: boolean;
  token: string | (() => string);
  type: "Bearer" | "token";
}
```

---

## Lộ Trình Xây Dựng (3–4 ngày)

| Ngày       | Việc cần làm                                                                                |
| ---------- | ------------------------------------------------------------------------------------------- |
| **Ngày 1** | `ApiProvider`, `apiClient`, `useAuth`                                                       |
| **Ngày 2** | `useGetDoc`, `useGetList`, `useGetCount`                                                    |
| **Ngày 3** | `useCreateDoc`, `useUpdateDoc`, `useDeleteDoc`                                              |
| **Ngày 4** | `useGetCall`, `usePostCall`, `usePutCall`, `useDeleteCall`, `useFileUpload`, `useDocSearch` |

---

## Điều Cần Xác Nhận Trước Khi Code

> ⚠️ Để các hook map đúng với backend, cần biết rõ:

1. **Auth endpoint**: `POST /auth/login` trả về token dạng gì?

   ```json
   { "token": "xxx" }  hay  { "access_token": "xxx" }
   ```

2. **Format response**: Bọc trong key nào?

   ```json
   { "data": [...] }  hay  { "message": [...] }  hay  [...] trực tiếp
   ```

3. **Method update**: Dùng `PUT` hay `PATCH` cho update?

4. **Endpoint pattern**: `/api/v1/tasks/:id` hay `/tasks/:id`?

5. **Upload endpoint**: Có sẵn chưa? Format nhận file như thế nào?
