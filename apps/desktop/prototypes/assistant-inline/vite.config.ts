import { resolve } from "node:path";
import { defineConfig } from "vite";
import base from "../../components.vite.config";

export default defineConfig({
  ...base,
  root: import.meta.dirname,
  cacheDir: resolve(
    import.meta.dirname,
    "../../node_modules/.vite-assistant-preview",
  ),
  resolve: {
    ...base.resolve,
    alias: {
      ...base.resolve?.alias,
      "@": resolve(import.meta.dirname, "../../src/renderer/src"),
      "@shared": resolve(import.meta.dirname, "../../src/shared"),
    },
  },
  optimizeDeps: { entries: ["index.html"] },
  build: { outDir: resolve(import.meta.dirname, "dist"), rollupOptions: { input: resolve(import.meta.dirname, "index.html") } },
  server: { host: "127.0.0.1", port: 4323, strictPort: true },
});
