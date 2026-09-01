import type { NextConfig } from "next";

// Validate environment variables at build/boot. Throws early on a bad `.env`.
import "./src/env";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
};

export default nextConfig;
