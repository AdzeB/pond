import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const stub = (p: string) =>
  fileURLToPath(new URL(`./test/stubs/${p}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // The extractor graph touches Electron only at runtime; stub the
      // bindings so the modules import in a plain Node test process.
      electron: stub("electron.ts"),
      "electron-log/main.js": stub("electron-log.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
