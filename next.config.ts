import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow max-quality brand assets in the header lockup
    qualities: [75, 90, 95, 100],
  },
};

export default nextConfig;
