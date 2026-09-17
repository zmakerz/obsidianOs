import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@business-os/database", "@business-os/kernel", "@business-os/marketing-pack"],
};

export default nextConfig;
