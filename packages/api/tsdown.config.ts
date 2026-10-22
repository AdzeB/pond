import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "neutral",
  target: "node20",
  tsconfig: "../tsconfig.api-build.json",
  deps: {
    alwaysBundle: [/^@pond\//, /^@react-querybuilder\//, /^drizzle-orm/],
  },
  dts: { resolve: true },
  clean: true,
});
