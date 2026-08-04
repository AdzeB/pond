import type { NextConfig } from "next";

/** Swap the tab icon outside prod so local/preview tabs are obvious at a glance. */
const FAVICONS = {
  preview: "/favicon.preview.svg",
  development: "/favicon.development.svg",
} as const;

const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
const favicon = FAVICONS[env as keyof typeof FAVICONS];

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pond/ui", "@pond/icons"],
  poweredByHeader: false,
  /** TypeScript 7 drops the JS compiler API; next build must shell out to tsc. */
  experimental: {
    useTypeScriptCli: true,
  },
  async rewrites() {
    if (!favicon) return [];
    return {
      beforeFiles: [{ source: "/favicon.svg", destination: favicon }],
    };
  },
};

export default config;
