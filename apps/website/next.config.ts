import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pond/ui", "@pond/icons"],
  poweredByHeader: false,
  /** TypeScript 7 drops the JS compiler API; next build must shell out to tsc. */
  experimental: {
    useTypeScriptCli: true,
  },
};

export default config;
