import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(scriptDirectory, "../..");
const repoRoot = resolve(desktopRoot, "../..");
const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "pond-tool-routing-benchmark-"),
);

try {
  await build({
    configFile: false,
    root: desktopRoot,
    logLevel: "error",
    ssr: { noExternal: true },
    build: {
      ssr: join(scriptDirectory, "run-tool-routing-benchmark.ts"),
      outDir: temporaryDirectory,
      emptyOutDir: false,
      minify: false,
      rollupOptions: {
        output: { entryFileNames: "benchmark.mjs" },
      },
    },
  });
  const benchmark = await import(
    pathToFileURL(join(temporaryDirectory, "benchmark.mjs")).href
  );
  await benchmark.runToolRoutingBenchmark(process.argv.slice(2), repoRoot);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Benchmark failed."}\n`,
  );
  process.exitCode = 1;
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
