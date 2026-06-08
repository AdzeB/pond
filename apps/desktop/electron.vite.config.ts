import { resolve } from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import type { Plugin } from "vite";

const CJS_SHIM = [
  'import __cjs_mod__ from "node:module";',
  "const __filename = import.meta.filename;",
  "const __dirname = import.meta.dirname;",
  "const require = __cjs_mod__.createRequire(import.meta.url);",
].join("\n");

const CJS_SHIM_RE =
  /\/\/ -- CommonJS Shims --\nimport __cjs_mod__.*\nconst __filename.*\nconst __dirname.*\nconst require.*\n/g;

function cjsShimPlugin(): Plugin {
  return {
    name: "pond:cjs-shim",
    apply: "build",
    enforce: "post",
    renderChunk(code: string, _chunk: unknown, options: { format: string }) {
      if (options.format !== "es") return null;
      const stripped = code.replace(CJS_SHIM_RE, "");
      if (!/(__filename|__dirname|require\()/.test(stripped)) return null;
      const lastImport = [...stripped.matchAll(/^import\s.+$/gm)].pop();
      const idx = lastImport
        ? (lastImport.index ?? 0) + lastImport[0].length
        : 0;
      return `${stripped.slice(0, idx)}\n${CJS_SHIM}\n${stripped.slice(idx)}`;
    },
  };
}

export default defineConfig({
  main: {
    plugins: [cjsShimPlugin()],
    resolve: {
      alias: {
        "@main": resolve(__dirname, "src/main"),
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
    build: {
      externalizeDeps: { exclude: ["@pond/schema"] },
      rollupOptions: {
        input: resolve(__dirname, "src/main/index.ts"),
        // Native modules must stay external so they resolve their
        // platform-specific .node binaries from node_modules at runtime
        // instead of being inlined into the bundle.
        external: ["electron", "better-sqlite3", "sharp"],
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: { exclude: ["@pond/schema"] },
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
          scrape: resolve(__dirname, "src/preload/scrape.cjs.ts"),
        },
        external: ["electron"],
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
          chunkFileNames: "[name].cjs",
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
        "@shared": resolve(__dirname, "src/shared"),
        "@pond/icons": resolve(__dirname, "../../packages/icons"),
        "@pond/ui": resolve(__dirname, "../../packages/ui/src"),
      },
    },
    build: {
      // Electron ships a recent Chromium; skip legacy transforms and
      // module-preload polyfills.
      target: "esnext",
      modulePreload: { polyfill: false },
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
        },
        output: {
          // One chunk per npm package: bumping a dependency invalidates
          // a single hash instead of vendor.js, and chunks parse in
          // parallel on cold start.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;
            const match = id.match(
              /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(@[^/]+\/[^/]+|[^/]+)/,
            );
            const pkg = match?.[1];
            if (!pkg) return;
            return `vendor-${pkg.replace(/^@/, "").replace(/\//g, "-")}`;
          },
        },
      },
    },
  },
});
