import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const stub = (p: string) =>
  fileURLToPath(new URL(`./test/stubs/${p}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      electron: stub("electron.ts"),
      "electron-log/main.js": stub("electron-log.ts"),
      "@": fileURLToPath(new URL("./src/renderer/src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
