import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  noExternal: [/^@pond\//, "pond-api"],
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
