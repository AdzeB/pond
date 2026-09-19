import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  noExternal: [/^@pond\//],
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
