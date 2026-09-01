import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export default defineConfig({
  root,
  publicDir: resolve(root, "../../../website/public/demo"),
  plugins: [react()],
  resolve: {
    alias: {
      react: dirname(require.resolve("react/package.json")),
      "react-dom": dirname(require.resolve("react-dom/package.json")),
      "@pond/icons": resolve(root, "../../../../packages/icons"),
      "@pond/ui": resolve(root, "../../../../packages/ui/src"),
    },
  },
  server: { host: "127.0.0.1", port: 4318, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
