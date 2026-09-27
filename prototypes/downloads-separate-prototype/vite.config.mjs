import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const nucleoOutline = fileURLToPath(
  new URL(
    "../../node_modules/.pnpm/nucleo-ui-outline-18@1.5.1_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/nucleo-ui-outline-18/dist/index.js",
    import.meta.url,
  ),
);

export default defineConfig({
  resolve: {
    alias: {
      "nucleo-ui-outline-18": nucleoOutline,
    },
  },
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
