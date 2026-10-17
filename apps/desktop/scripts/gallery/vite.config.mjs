import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);
const desktop = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Builds only the gallery page; the app bundle never includes it. */
export default defineConfig({
  root: resolve(desktop, "src/renderer"),
  base: "./",
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: dirname(require.resolve("react/package.json")),
      "react-dom": dirname(require.resolve("react-dom/package.json")),
      "@": resolve(desktop, "src/renderer/src"),
      "@shared": resolve(desktop, "src/shared"),
      "@pond/icons": resolve(desktop, "../../packages/icons"),
      "@pond/ui": resolve(desktop, "../../packages/ui/src"),
    },
  },
  build: {
    outDir: resolve(desktop, "out/gallery"),
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      input: resolve(desktop, "src/renderer/gallery.html"),
    },
  },
});
