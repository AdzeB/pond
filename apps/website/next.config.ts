import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pond/ui", "@pond/icons"],
  poweredByHeader: false,
};

export default config;
