import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const require = createRequire(import.meta.url);

export default defineConfig({
  root,
  plugins: [react()],
  cacheDir: resolve(root, "../../node_modules/.vite-assistant-output"),
  resolve: {
    alias: {
      react: dirname(require.resolve("react/package.json")),
      "react-dom": dirname(require.resolve("react-dom/package.json")),
      "@pond/icons": resolve(root, "../../../../packages/icons"),
      "@pond/ui": resolve(root, "../../../../packages/ui/src"),
    },
  },
  server: { host: "127.0.0.1", port: 4325, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
