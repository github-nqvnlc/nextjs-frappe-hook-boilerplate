# windify/task-view

A Next.js application integrated with **Frappe Framework** backend, featuring a custom React hooks library for interacting with the Frappe REST API.

---

## Requirements

- Node.js 18+
- A running Frappe backend (e.g. `https://your-frappe-site.com`)

---

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file at the project root:

```env
# Frappe backend URL — used server-side by Next.js for proxying
FRAPPE_URL=https://your-frappe-site.com
```

> **Note:** The browser never calls `FRAPPE_URL` directly. All `/api/*` requests are forwarded by the **Next.js server** (server-to-server) to Frappe, eliminating CORS issues and ensuring the `sid` session cookie works correctly on `localhost`.

---

## API Proxy Architecture

```text
Browser → localhost:3000/api/resource/...
              ↓  Next.js rewrite (server-side)
    your-frappe-site.com/api/resource/...
```

Configured in `next.config.ts`:

```ts
{ source: '/api/:path*', destination: `${FRAPPE_URL}/api/:path*` }
```

---

## Hooks

All hooks are exported from `src/hooks/index.ts`.

### Provider Setup

Wrap your application with `ApiProvider` (already included in `src/app/layout.tsx`):

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
const { currentUser, login, logout, isLoading } = useAuth();

await login("admin", "password");
await logout();
console.log(currentUser); // "admin@example.com" | null
```

---

### Read Hooks

#### `useGetDoc<T>`

Fetch a single document by doctype and name.

```tsx
const { data, isLoading, error, mutate } = useGetDoc("Task", "TASK-0001");
```

| Param      | Type              | Description            |
| ---------- | ----------------- | ---------------------- |
| `resource` | `string`          | Doctype name           |
| `id`       | `string \| null`  | Document name          |
| `options`  | `UseQueryOptions` | TanStack Query options |

---

#### `useGetList<T>`

Fetch a list of documents with filters, sorting, and pagination.

```tsx
const { data, isLoading, error } = useGetList("Task", {
  fields: ["name", "subject", "status"],
  filters: [["status", "=", "Open"]],
  limit: 20,
  orderBy: { field: "creation", order: "desc" },
});
```

**Supported filter operators:** `=` `!=` `<` `>` `<=` `>=` `like` `not like` `in` `not in`

---

#### `useGetCount`

Count documents matching a filter.

```tsx
const { data: count } = useGetCount("Task", [["status", "=", "Open"]]);
```

---

### Write Hooks

#### `useCreateDoc<T>`

```tsx
const { createDoc, loading, result, error, reset } = useCreateDoc("Task");

await createDoc({ subject: "New Task", status: "Open" });
```

#### `useUpdateDoc<T>`

```tsx
const { updateDoc, loading, result } = useUpdateDoc("Task");

await updateDoc("TASK-0001", { status: "Closed" });
```

#### `useDeleteDoc`

```tsx
const { deleteDoc, loading, isCompleted } = useDeleteDoc("Task");

await deleteDoc("TASK-0001");
```

---

### Raw Endpoint Hooks

#### `useGetCall<T>`

```tsx
const { data } = useGetCall("/api/method/frappe.auth.get_logged_user");
```

#### `usePostCall` / `usePutCall` / `useDeleteCall`

```tsx
const { call, loading, result } = usePostCall(
  "/api/method/myapp.api.create_something",
);

await call({ key: "value" });
```

---

### Utilities

#### `useFileUpload`

Upload a file with progress tracking.

```tsx
const { upload, loading, progress, result } = useFileUpload();

await upload(file, {
  isPrivate: false,
  doctype: "Task",
  docname: "TASK-0001",
  fieldname: "attachment",
});

console.log(result?.file_url);
```

#### `useDocSearch`

Debounced document search for autocomplete UIs.

```tsx
const { data } = useDocSearch("Customer", searchText, {
  fields: ["name", "customer_name"],
  debounce: 300,
});
```

---

## Dev Tools

Visit `/dev/doc` to interactively test all hooks:

- Input forms for every hook's parameters
- Live response panel (data / loading / error states)
- **Copy JSON** and **Copy cURL** buttons on the response

---

## Project Structure

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
└── types/
    └── hooks.ts            # Shared TypeScript types
```

---

## Authentication Model

The library uses Frappe's **session cookie** (`sid`). After a successful `login()`, the cookie is set automatically by the browser. All subsequent requests include it via `withCredentials: true`.

Mutations (POST / PUT / DELETE) automatically attach the **CSRF token** from the `csrf_token` cookie via the `X-Frappe-CSRF-Token` header.
