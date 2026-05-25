# Cloudflare Workers Deployment Guide

Hướng dẫn deploy Next.js application lên Cloudflare Workers sử dụng OpenNext adapter.

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Yêu cầu](#yêu-cầu)
- [Setup cho Project mới](#setup-cho-project-mới)
- [Cấu hình](#cấu-hình)
- [Commands](#commands)
- [API Proxy](#api-proxy)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Giới thiệu

OpenNext là adapter cho phép deploy ứng dụng Next.js lên Cloudflare Workers - nền tảng serverless edge với:
- Sub-millisecond cold starts
- 300+ edge locations toàn cầu
- Direct bindings tới D1, R2, KV, Durable Objects

### Supported Next.js Versions

| Version | Status |
|---------|--------|
| Next.js 15 | >= 15.5.18 |
| Next.js 16 | >= 16.2.6 (khuyến nghị) |

### Supported Features

| Feature | Status |
|---------|--------|
| App Router | ✅ |
| Server Components | ✅ |
| Server Actions | ✅ |
| ISR | ✅ (with R2/KV) |
| Edge Middleware | ✅ |
| Node.js Middleware (proxy.ts) | ❌ |

---

## Yêu cầu

### System Requirements

- Node.js >= 20.x
- npm >= 10.x

### Dependencies

```json
{
  "@opennextjs/cloudflare": "^1.19.x",
  "wrangler": "^4.86.0"
}
```

---

## Setup cho Project mới

### 1. Upgrade Next.js Version

OpenNext yêu cầu Next.js version cụ thể:

**Next.js 15:**
```bash
npm install next@15.5.18 eslint-config-next@15.5.18
```

**Next.js 16 (Khuyến nghị):**
```bash
npm install next@16.2.6 eslint-config-next@16.2.6
```

### 2. Chuyển proxy.ts sang middleware.ts

OpenNext Cloudflare **không hỗ trợ** Node.js middleware. Cần convert `src/proxy.ts` sang `src/middleware.ts`:

```typescript
// src/middleware.ts (Edge Middleware)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const sid = request.cookies.get('sid')?.value;
  const isLoggedIn = !!sid && sid !== 'Guest';

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 3. Cài đặt Dependencies

```bash
npm install @opennextjs/cloudflare wrangler
```

### 4. Tạo cấu hình

#### wrangler.toml

```toml
name = "your-app-name"
main = ".open-next/worker.js"
compatibility_date = "2026-05-01"
compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[[services]]
binding = "WORKER_SELF_REFERENCE"
service = "your-app-name"

# Default value - có thể override bằng .env.production
[vars]
NEXT_PUBLIC_APP_URL = "https://your-domain.com"
```

#### open-next.config.ts

```typescript
/** @type {import('@opennextjs/cloudflare').OpenNext.Config} */
const config = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  edgeExternals: ['node:crypto'],
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
};

export default config;
```

#### .dev.vars

```bash
NEXTJS_ENV=development
```

#### public/_headers

```apache
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable
```

### 5. Cập nhật next.config.ts

```typescript
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const FRAPPE_URL = process.env.FRAPPE_URL ?? "https://your-frappe-site.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${FRAPPE_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

### 6. Cập nhật package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "node scripts/deploy.mjs",
    "deploy:wrangler": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "upload": "opennextjs-cloudflare build && opennextjs-cloudflare upload",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
  }
}
```

### 7. Tạo script deploy

Tạo file `scripts/deploy.mjs`:

```javascript
import { config } from "dotenv";
import { execSync } from "child_process";
import { resolve } from "path";

// Load .env.production
const envPath = resolve(process.cwd(), ".env.production");
config({ path: envPath, override: true });

// Get vars from env
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_FRAPPE_URL;

console.log(`🚀 Deploying with APP_URL: ${appUrl || "(default)"}`);

// Build
console.log("📦 Building Next.js app...");
execSync("npm run build", { stdio: "inherit" });

// Deploy
console.log("☁️  Deploying to Cloudflare Workers...");
const deployCmd = appUrl
  ? `./node_modules/.bin/wrangler deploy --var NEXT_PUBLIC_APP_URL:"${appUrl}"`
  : "./node_modules/.bin/wrangler deploy";

execSync(deployCmd, { stdio: "inherit" });
console.log("✅ Deploy complete!");
```

### 8. Cập nhật .gitignore

```gitignore
# OpenNext Cloudflare
.open-next/
cloudflare-env.d.ts

# Wrangler
.wrangler/

# Scripts
scripts/*.mjs
```

---

## Cấu hình

### Environment Variables

#### .env.local (Development)

```bash
FRAPPE_URL=https://smr.windify.net
NEXT_PUBLIC_FRAPPE_URL=https://smr.windify.net
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTJS_ENV=development
```

#### .env.production (Production)

```bash
FRAPPE_URL=https://smr.windify.net
NEXT_PUBLIC_FRAPPE_URL=https://smr.windify.net
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
NEXTJS_ENV=production
```

### Wrangler Secrets

```bash
# Set required secrets
npx wrangler secret put FRAPPE_URL
# Enter: https://your-frappe-site.com
```

### Optional: Enable ISR Cache

#### Với KV Namespace

```bash
npx wrangler kv namespace create "NEXT_CACHE"
```

Thêm vào wrangler.toml:
```toml
[[kv_namespaces]]
binding = "NEXT_CACHE"
id = "<YOUR_KV_NAMESPACE_ID>"
```

#### Với R2 Bucket

```bash
npx wrangler r2 bucket create "next-cache"
```

Thêm vào wrangler.toml:
```toml
[[r2_buckets]]
binding = "NEXT_INC_CACHE_R2_BUCKET"
bucket_name = "next-cache"
```

---

## Commands

```bash
# Local development (Node.js runtime - standard Next.js)
npm run dev

# Preview locally (Workers runtime - chính xác như production)
npm run preview

# Deploy to Cloudflare (đọc .env.production)
npm run deploy

# Deploy to Cloudflare (dùng wrangler mặc định)
npm run deploy:wrangler

# Upload as new version (mở dashboard)
npm run upload

# Generate Cloudflare types
npm run cf-typegen
```

---

## API Proxy

**Quan trọng**: OpenNext Cloudflare **không hỗ trợ** Next.js rewrites. Rewrite trong `next.config.ts` chỉ hoạt động local, không hoạt động khi deploy.

### Options

#### Option 1: Cloudflare Routes (Khuyến nghị)

Tạo separate Worker để handle API:

```javascript
// frappe-api-worker/index.ts
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    return fetch(`${env.FRAPPE_URL}${url.pathname}${url.search}`, request);
  }
};
```

Deploy với routes:
```bash
npx wrangler deploy --name frappe-api
```

Configure routes trong Cloudflare Dashboard:
```
api.your-domain.com/*  → frappe-api worker
your-domain.com/*       → nextjs-frappe-hook worker
```

#### Option 2: Subdirectory

Dùng `/frappe-api/*` và configure riêng.

#### Option 3: Cloudflare Pages

Dùng Cloudflare Pages với `_routes.json` để có routing linh hoạt hơn.

---

## Deployment

### Local Deployment

```bash
# Preview trước
npm run preview

# Deploy
npm run deploy
```

### CI/CD với GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Deploy
        run: npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Set Secrets cho Production

```bash
# Set required secrets
npx wrangler secret put FRAPPE_URL

# Optional: Override NEXT_PUBLIC_APP_URL từ .env.production
# (Script deploy.mjs sẽ tự đọc và truyền qua --var)
```

---

## Troubleshooting

### "Node.js middleware is not currently supported"

**Nguyên nhân**: App sử dụng `proxy.ts` (Node.js middleware)

**Giải pháp**: Chuyển sang `middleware.ts` (Edge Middleware)

### Build fails với peer dependency errors

**Nguyên nhân**: Sai Next.js version

**Giải pháp**:
- Next.js 15: `npm install next@15.5.18`
- Next.js 16: `npm install next@16.2.6`

### Middleware not working

**Nguyên nhân**: File location hoặc syntax

**Giải pháp**:
- Đảm bảo middleware ở `src/middleware.ts`
- Không sử dụng Node.js APIs (fs, path, etc.)
- Export function tên `middleware` (không phải `proxy`)

### Wrangler entry point not found

**Nguyên nhân**: Chưa build hoặc wrangler.toml sai config

**Giải pháp**:
- Chạy `npm run build` trước
- Kiểm tra `main = ".open-next/worker.js"` trong wrangler.toml

### Cookie/Session not working

**Nguyên nhân**: CORS hoặc cookie domain issue khi proxy

**Giải pháp**:
- Sử dụng separate API Worker thay vì Next.js rewrites
- Set cookie domain phù hợp trong Frappe config

---

## Quick Reference

| Task | Command |
|------|---------|
| Preview local | `npm run preview` |
| Deploy | `npm run deploy` |
| Deploy (wrangler) | `npm run deploy:wrangler` |
| Set secret | `npx wrangler secret put FRAPPE_URL` |
| Check auth | `npx wrangler whoami` |
| View logs | `npx wrangler tail` |

---

## Tài liệu tham khảo

- [OpenNext Cloudflare Docs](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
