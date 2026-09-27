import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, resolve, sep } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { cssComposesHmr } from "./css-composes-hmr.ts";

const require = createRequire(import.meta.url);
const reactDir = dirname(require.resolve("react/package.json"));
const reactDomDir = dirname(require.resolve("react-dom/package.json"));
const eagleReferenceRoot = resolve(
  import.meta.dirname,
  ".tmp/screenshot-compare/eagle",
);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function eagleReferenceFixture(): Plugin {
  return {
    name: "pond-eagle-picker-reference",
    configureServer(server) {
      server.middlewares.use(
        "/__eagle_reference__",
        async (request, response, next) => {
          try {
            const pathname = decodeURIComponent(
              new URL(request.url ?? "/", "http://localhost").pathname,
            );
            const relativePath =
              pathname === "/" ? "index.html" : pathname.slice(1);
            const filePath = resolve(eagleReferenceRoot, relativePath);
            const isWithinFixture =
              filePath === eagleReferenceRoot ||
              filePath.startsWith(`${eagleReferenceRoot}${sep}`);

            if (!isWithinFixture) {
              response.statusCode = 403;
              response.end();
              return;
            }

            const fileStat = await stat(filePath);
            if (!fileStat.isFile()) {
              next();
              return;
            }

            response.statusCode = 200;
            response.setHeader(
              "Content-Type",
              contentTypes.get(extname(filePath)) ?? "application/octet-stream",
            );
            response.setHeader("Cache-Control", "no-store");
            createReadStream(filePath).pipe(response);
          } catch {
            next();
          }
        },
      );
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, "src/renderer"),
  plugins: [
    eagleReferenceFixture(),
    cssComposesHmr([
      resolve(import.meta.dirname, "../../packages/ui/src"),
      resolve(import.meta.dirname, "../../packages/theme/src"),
    ]),
    react(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: reactDir,
      "react-dom": reactDomDir,
      "@": resolve(import.meta.dirname, "src/renderer/src"),
      "@shared": resolve(import.meta.dirname, "src/shared"),
      "@pond/icons": resolve(import.meta.dirname, "../../packages/icons"),
      "@pond/ui": resolve(import.meta.dirname, "../../packages/ui/src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
});
