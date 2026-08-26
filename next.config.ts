import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Allow max-quality brand assets in the header lockup
    qualities: [75, 90, 95, 100],
  },
};

export default withNextIntl(nextConfig);
