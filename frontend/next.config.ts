import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Proxy API requests to the backend during development */
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.BACKEND_API_URL || "http://localhost:3001"}/api/:path*`,
        },
      ],
      fallback: [
        {
          source: "/:path*",
          destination: `${process.env.BACKEND_API_URL || "http://localhost:3001"}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
