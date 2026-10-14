import { resolve } from "node:path";
import { mergeConfig } from "vite";
import gallery from "../../toolbar-gallery.vite.config.ts";

const renderer = resolve(import.meta.dirname, "../../src/renderer");

export default mergeConfig(gallery, {
  build: {
    outDir: resolve(import.meta.dirname, "../../.tmp/launch-video/dist"),
    emptyOutDir: true,
    sourcemap: false,
    target: "esnext",
    rollupOptions: {
      input: {
        app: resolve(renderer, "launch-video-app.html"),
        stage: resolve(renderer, "launch-video.html"),
        short: resolve(renderer, "launch-video-short.html"),
      },
    },
  },
});
