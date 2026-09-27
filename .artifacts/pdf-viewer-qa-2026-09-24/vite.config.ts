import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import react from "../../apps/desktop/node_modules/@vitejs/plugin-react/dist/index.js";

const repository = resolve(import.meta.dirname, "../..");
const require = createRequire(
  new URL("../../apps/desktop/package.json", import.meta.url),
);
const reactDir = dirname(require.resolve("react/package.json"));
const reactDomDir = dirname(require.resolve("react-dom/package.json"));

export default {
  root: import.meta.dirname,
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      {
        find: "@/features/saves/lib/media/url",
        replacement: resolve(import.meta.dirname, "qa-media-url.ts"),
      },
      { find: "react", replacement: reactDir },
      { find: "react-dom", replacement: reactDomDir },
      {
        find: "@",
        replacement: resolve(repository, "apps/desktop/src/renderer/src"),
      },
      {
        find: "@shared",
        replacement: resolve(repository, "apps/desktop/src/shared"),
      },
      {
        find: "@pond/icons",
        replacement: resolve(repository, "packages/icons"),
      },
      {
        find: "@pond/schema",
        replacement: resolve(repository, "packages/schema/src"),
      },
      {
        find: "@pond/ui",
        replacement: resolve(repository, "packages/ui/src"),
      },
    ],
  },
  server: {
    fs: {
      allow: [repository, "/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T"],
    },
    host: "127.0.0.1",
  },
};
