# Next.js + Frappe Boilerplate

Next.js application tích hợp với **Frappe Framework** backend, bao gồm thư viện custom React hooks để tương tác với Frappe REST API.

---

## Mục lục

- [Quick Start](#quick-start)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Hooks](#hooks)
- [Dev Tools](#dev-tools)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [API Proxy](#api-proxy)

---

## Quick Start

### Local Development (Node.js)

```bash
npm install
npm run dev
```

### Preview (Cloudflare Workers Runtime)

```bash
npm run preview
```

### Deploy to Cloudflare

```bash
npm run deploy
npx wrangler secret put FRAPPE_URL
```

---

## Cài đặt

### Yêu cầu

- Node.js >= 20.x
- npm >= 10.x
- Frappe backend đang chạy

### Environment Variables

#### Development (.env.local)

```bash
FRAPPE_URL=https://smr.windify.net
NEXT_PUBLIC_FRAPPE_URL=https://smr.windify.net
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTJS_ENV=development
```

#### Production (.env.production)

```bash
FRAPPE_URL=https://smr.windify.net
NEXT_PUBLIC_FRAPPE_URL=https://smr.windify.net
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
NEXTJS_ENV=production
```

> **Lưu ý:** Browser không gọi thẳng đến `FRAPPE_URL`. Mọi request `/api/*` của browser sẽ được **Next.js proxy** (server-to-server) forward sang Frappe, giúp tránh lỗi CORS và cho phép cookie `sid` hoạt động đúng trên `localhost`.

---

## Kiến trúc API Proxy

```
Browser → localhost:3000/api/resource/...
              ↓ (Next.js rewrite — server-side)
    your-frappe-site.com/api/resource/...  (Frappe)
```

Cấu hình trong `next.config.ts`:

```ts
source: '/api/:path*',
destination: `${FRAPPE_URL}/api/:path*`
```

---

## Hooks

Toàn bộ hooks được export từ `src/hooks/index.ts`.

### Thiết lập Provider

Wrap ứng dụng bằng `ApiProvider` (đã có trong `src/app/layout.tsx`):

```tsx
import { ApiProvider } from "@/lib/ApiProvider";

export default function RootLayout({ children }) {
  return <ApiProvider>{children}</ApiProvider>;
}
```

---

### Authentication

#### `useAuth`

```tsx
import { useAuth } from "@/hooks";

const { currentUser, login, logout, isLoading } = useAuth();

// Đăng nhập
await login("admin", "password");

// Đăng xuất
await logout();

// User hiện tại (null nếu chưa đăng nhập)
console.log(currentUser); // "admin@example.com" | null
```

---

### Document Hooks (Read)

#### `useGetDoc<T>`

Lấy một document theo doctype và name.

```tsx
import { useGetDoc } from "@/hooks";

const { data, isLoading, error, mutate } = useGetDoc("Task", "TASK-0001");
```

| Tham số    | Kiểu              | Mô tả                  |
| ---------- | ----------------- | ---------------------- |
| `resource` | `string`          | Tên Doctype            |
| `id`       | `string \| null`  | Name của document      |
| `options`  | `UseQueryOptions` | TanStack Query options |

---

#### `useGetList<T>`

Lấy danh sách documents với filter, sort, pagination.

```tsx
import { useGetList } from "@/hooks";

const { data, isLoading, error } = useGetList("Task", {
  fields: ["name", "subject", "status"],
  filters: [["status", "=", "Open"]],
  limit: 20,
  orderBy: { field: "creation", order: "desc" },
});
```

**Operators filter:** `=`, `!=`, `<`, `>`, `<=`, `>=`, `like`, `not like`, `in`, `not in`

---

#### `useGetCount`

Đếm số lượng documents theo filter.

```tsx
import { useGetCount } from "@/hooks";

const { data: count, isLoading } = useGetCount("Task", [
  ["status", "=", "Open"],
]);
```

---

### Document Hooks (Write)

#### `useCreateDoc<T>`

```tsx
import { useCreateDoc } from "@/hooks";

const { createDoc, loading, result, error, reset } = useCreateDoc("Task");

await createDoc({ subject: "New Task", status: "Open" });
```

---

#### `useUpdateDoc<T>`

```tsx
import { useUpdateDoc } from "@/hooks";

const { updateDoc, loading, result, error } = useUpdateDoc("Task");

await updateDoc("TASK-0001", { status: "Closed" });
```

---

#### `useDeleteDoc`

```tsx
import { useDeleteDoc } from "@/hooks";

const { deleteDoc, loading, isCompleted } = useDeleteDoc("Task");

await deleteDoc("TASK-0001");
```

---

### Raw Endpoint Hooks

#### `useGetCall<T>`

Gọi `GET` đến bất kỳ endpoint nào.

```tsx
import { useGetCall } from "@/hooks";

const { data, isLoading } = useGetCall(
  "/api/method/frappe.auth.get_logged_user",
);
```

---

#### `usePostCall` / `usePutCall` / `useDeleteCall`

```tsx
import { usePostCall, usePutCall, useDeleteCall } from "@/hooks";

const { call, loading, result, error } = usePostCall(
  "/api/method/myapp.api.do_something",
);

await call({ key: "value" });
```

---

### Utilities

#### `useFileUpload`

Upload file lên Frappe với progress tracking.

```tsx
import { useFileUpload } from "@/hooks";

const { upload, loading, progress, result, error } = useFileUpload();

await upload(file, {
  isPrivate: false,
  doctype: "Task",
  docname: "TASK-0001",
  fieldname: "attachment",
});

console.log(result?.file_url); // URL của file đã upload
```

---

#### `useDocSearch`

Tìm kiếm documents với debounce (dành cho autocomplete).

```tsx
import { useDocSearch } from "@/hooks";

const { data, isLoading } = useDocSearch("Customer", searchText, {
  fields: ["name", "customer_name"],
  debounce: 300, // ms
});
```

---

## Dev Tools

Truy cập `/dev/doc` để test tất cả hooks tương tác:

- Form nhập tham số cho từng hook
- Response panel hiển thị data / loading / error realtime
- Nút **Copy JSON** và **Copy cURL** trên response

---

## Cấu trúc thư mục

```
src/
├── app/
│   ├── layout.tsx          # Root layout + ApiProvider
│   ├── page.tsx            # Home page
│   ├── login/page.tsx      # Login page
│   └── dev/doc/page.tsx    # Hooks tester (dev only)
├── hooks/
│   ├── index.ts            # Barrel export
│   ├── useAuth.ts
│   ├── useGetDoc.ts
│   ├── useGetList.ts
│   ├── useGetCount.ts
│   ├── useCreateDoc.ts
│   ├── useUpdateDoc.ts
│   ├── useDeleteDoc.ts
│   ├── useGetCall.ts
│   ├── useMutationCall.ts  # usePostCall, usePutCall, useDeleteCall
│   ├── useFileUpload.ts
│   └── useDocSearch.ts
├── lib/
│   ├── ApiProvider.tsx     # QueryClientProvider + apiClient init
│   └── apiClient.ts        # Axios instance + CSRF interceptor
├── middleware.ts           # Edge Middleware (auth guard)
└── types/
    └── hooks.ts            # Shared TypeScript types
```

---

## Authentication

Sử dụng Frappe **session cookie** (`sid`). Sau khi `login()` thành công, cookie được set tự động bởi trình duyệt. Mọi request sau đó tự động đính kèm cookie (qua `withCredentials: true`).

Mutations (POST / PUT / DELETE) tự động đính kèm **CSRF token** từ cookie `csrf_token` qua header `X-Frappe-CSRF-Token`.

---

## Deployment

### Cloudflare Workers (OpenNext)

#### Yêu cầu

- Next.js >= 16.2.6 (khuyến nghị: 16.2.6)
- wrangler >= 4.86.0

#### Setup

```bash
# Install dependencies
npm install @opennextjs/cloudflare wrangler

# Preview locally (Workers runtime)
npm run preview

# Deploy (đọc .env.production)
npm run deploy

# Set secrets
npx wrangler secret put FRAPPE_URL
```

#### Deploy Script

Script `scripts/deploy.mjs` tự động:
1. Đọc `NEXT_PUBLIC_APP_URL` từ `.env.production`
2. Build Next.js
3. Deploy với `--var` để override

#### Commands

| Task | Command |
|------|---------|
| Preview local | `npm run preview` |
| Deploy | `npm run deploy` |
| Deploy (wrangler) | `npm run deploy:wrangler` |
| Upload version | `npm run upload` |
| Generate types | `npm run cf-typegen` |
| Set secret | `npx wrangler secret put FRAPPE_URL` |
| Check auth | `npx wrangler whoami` |
| View logs | `npx wrangler tail` |

---

## API Proxy

**Quan trọng**: OpenNext Cloudflare **không hỗ trợ** Next.js rewrites khi deploy. Rewrite trong `next.config.ts` chỉ hoạt động local.

### Options cho Production

#### Option 1: Cloudflare Routes (Khuyến nghị)

Deploy separate Worker cho API:

```javascript
// frappe-api-worker/index.ts
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    return fetch(`${env.FRAPPE_URL}${url.pathname}${url.search}`, request);
  }
};
```

Configure routes trong Cloudflare Dashboard:
```
api.your-domain.com/*  → frappe-api worker
your-domain.com/*      → nextjs-frappe-hook worker
```

#### Option 2: Subdirectory

Dùng `/frappe-api/*` và configure riêng.

#### Option 3: Cloudflare Pages

Dùng Cloudflare Pages với `_routes.json`.

---

## Troubleshooting

### "Node.js middleware is not currently supported"

**Nguyên nhân**: App sử dụng `proxy.ts` (Node.js middleware)

**Giải pháp**: Đã chuyển sang `middleware.ts` (Edge Middleware)

### Build fails với peer dependency errors

**Giải pháp**:
- Next.js 15: `npm install next@15.5.18`
- Next.js 16: `npm install next@16.2.6`

### Cookie/Session not working ở Production

**Nguyên nhân**: CORS hoặc cookie domain issue khi proxy

**Giải pháp**:
- Sử dụng separate API Worker thay vì Next.js rewrites
- Set cookie domain phù hợp trong Frappe config

---

## Tài liệu tham khảo

- [OpenNext Cloudflare Docs](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [CLOUDFLARE.md](./CLOUDFLARE.md) - Chi tiết deployment
