import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Stop browsers MIME-sniffing responses into executable types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Block clickjacking. NOTE: when Canvas LTI embedding lands, swap
          // this for a Content-Security-Policy frame-ancestors allowing the
          // Canvas origin instead.
          { key: "X-Frame-Options", value: "DENY" },
          // Don't leak full URLs (search queries live in ours) cross-origin.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The app needs none of these powerful APIs.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
