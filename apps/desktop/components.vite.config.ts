import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const directory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export default defineConfig({
  root: resolve(directory, "src/renderer"),
  cacheDir: resolve(directory, "node_modules/.vite-components"),
  plugins: [react()],
  optimizeDeps: {
    entries: [
      "components.html",
      "downloads.html",
      "source-dialogs.html",
      "provider-settings.html",
      "shadows.html",
    ],
  },
  build: {
    outDir: resolve(directory, "out/components"),
    rollupOptions: {
      input: {
        components: resolve(directory, "src/renderer/components.html"),
        downloads: resolve(directory, "src/renderer/downloads.html"),
        providerSettings: resolve(
          directory,
          "src/renderer/provider-settings.html",
        ),
        sourceDialogs: resolve(directory, "src/renderer/source-dialogs.html"),
        shadows: resolve(directory, "src/renderer/shadows.html"),
      },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": resolve(directory, "src/renderer/src"),
      "@shared": resolve(directory, "src/shared"),
      react: dirname(require.resolve("react/package.json")),
      "react-dom": dirname(require.resolve("react-dom/package.json")),
      "@pond/icons": resolve(directory, "../../packages/icons"),
      "@pond/ui": resolve(directory, "../../packages/ui/src"),
      "@pond/theme": resolve(directory, "../../packages/theme/src"),
    },
  },
  server: { host: "127.0.0.1", port: 4322, strictPort: true },
});
