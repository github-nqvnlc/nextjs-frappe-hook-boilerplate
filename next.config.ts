import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const FRAPPE_URL = process.env.FRAPPE_URL ?? "https://your-frappe-site.com";

const nextConfig: NextConfig = {
  /**
   * Rewrites: proxy mọi request /api/* sang Frappe backend.
   *
   * LƯU Ý: Khi deploy lên Cloudflare Workers, rewrites không hoạt động.
   * Cần xử lý proxy /api/* qua Cloudflare Worker routes.
   * Xem CLOUDFLARE.md để biết thêm chi tiết.
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
