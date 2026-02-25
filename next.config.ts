import type { NextConfig } from "next";

const FRAPPE_URL = process.env.FRAPPE_URL ?? "https://your-frappe-site.com";

const nextConfig: NextConfig = {
  /**
   * Rewrites: proxy mọi request /api/* sang Frappe backend.
   *
   * TẠI SAO CẦN:
   * - Frappe cookies (sid) được set trên cds.windify.net, không phải localhost
   * - Khi dùng proxy, browser gọi localhost:3000/api/* (same-origin)
   * - Next.js server forward sang cds.windify.net (server-to-server, không có CORS)
   * - Cookie Frappe trả về được set trên localhost:3000 ✅
   *
   * LƯU Ý: Nếu bạn có Next.js API Routes trong /app/api/ hoặc /pages/api/,
   * chúng sẽ được ưu tiên trước rewrite này.
   */
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
