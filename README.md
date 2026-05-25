# Next.js + Frappe Boilerplate

A Next.js application integrated with **Frappe Framework** backend, featuring a custom React hooks library for interacting with the Frappe REST API.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Setup](#setup)
- [Configuration](#configuration)
- [Hooks](#hooks)
- [Dev Tools](#dev-tools)
- [Project Structure](#project-structure)
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

## Setup

### Requirements

- Node.js >= 20.x
- npm >= 10.x
- A running Frappe backend

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

> **Note:** The browser never calls `FRAPPE_URL` directly. All `/api/*` requests are forwarded by the **Next.js server** (server-to-server) to Frappe, eliminating CORS issues and ensuring the `sid` session cookie works correctly on `localhost`.

---

## API Proxy Architecture

```
Browser → localhost:3000/api/resource/...
              ↓ (Next.js rewrite — server-side)
    your-frappe-site.com/api/resource/...  (Frappe)
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
├── middleware.ts           # Edge Middleware (auth guard)
└── types/
    └── hooks.ts            # Shared TypeScript types
```

---

## Authentication

The library uses Frappe's **session cookie** (`sid`). After a successful `login()`, the cookie is set automatically by the browser. All subsequent requests include it via `withCredentials: true`.

Mutations (POST / PUT / DELETE) automatically attach the **CSRF token** from the `csrf_token` cookie via the `X-Frappe-CSRF-Token` header.

---

## Deployment

### Cloudflare Workers (OpenNext)

#### Requirements

- Next.js >= 16.2.6 (recommended: 16.2.6)
- wrangler >= 4.86.0

#### Setup

```bash
# Install dependencies
npm install @opennextjs/cloudflare wrangler

# Preview locally (Workers runtime)
npm run preview

# Deploy (reads .env.production)
npm run deploy

# Set secrets
npx wrangler secret put FRAPPE_URL
```

#### Deploy Script

The `scripts/deploy.mjs` script automatically:
1. Reads `NEXT_PUBLIC_APP_URL` from `.env.production`
2. Builds Next.js
3. Deploys with `--var` to override

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

**Important**: OpenNext Cloudflare **does not support** Next.js rewrites when deployed. The rewrite in `next.config.ts` only works locally.

### Options for Production

#### Option 1: Cloudflare Routes (Recommended)

Deploy a separate Worker for API:

```javascript
// frappe-api-worker/index.ts
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    return fetch(`${env.FRAPPE_URL}${url.pathname}${url.search}`, request);
  }
};
```

Configure routes in Cloudflare Dashboard:
```
api.your-domain.com/*  → frappe-api worker
your-domain.com/*      → nextjs-frappe-hook worker
```

#### Option 2: Subdirectory

Use `/frappe-api/*` and configure separately.

#### Option 3: Cloudflare Pages

Use Cloudflare Pages with `_routes.json` for more flexible routing.

---

## Troubleshooting

### "Node.js middleware is not currently supported"

**Cause**: App uses `proxy.ts` (Node.js middleware)

**Solution**: Already converted to `middleware.ts` (Edge Middleware)

### Build fails with peer dependency errors

**Solution**:
- Next.js 15: `npm install next@15.5.18`
- Next.js 16: `npm install next@16.2.6`

### Cookie/Session not working in Production

**Cause**: CORS or cookie domain issue with proxy

**Solution**:
- Use separate API Worker instead of Next.js rewrites
- Set appropriate cookie domain in Frappe config

---

## References

- [OpenNext Cloudflare Docs](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [CLOUDFLARE.md](./CLOUDFLARE.md) - Detailed deployment guide
