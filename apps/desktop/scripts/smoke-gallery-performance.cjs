const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const args = process.argv.slice(2);
  const take = (flag, fallback) => {
    const index = args.indexOf(flag);
    if (index < 0) return fallback;
    assert.ok(args[index + 1] && !args[index + 1].startsWith("--"), flag);
    return args[index + 1];
  };
  const desktop = path.resolve(take("--desktop", path.join(__dirname, "..")));
  const sizes = take("--sizes", "1000,10000,100000").split(",").map(Number);
  assert.ok(
    sizes.length && sizes.every((size) => [1000, 10000, 100000].includes(size)),
  );
  const seedOnly = args.includes("--seed-only");
  const output = path.resolve(
    take(
      "--output",
      fs.mkdtempSync(path.join(os.tmpdir(), "pond-gallery-results-")),
    ),
  );
  fs.mkdirSync(output, { recursive: true });
  const requireDesktop = createRequire(path.join(desktop, "package.json"));
  const electron = requireDesktop("electron");
  const esbuild = createRequire(requireDesktop.resolve("electron-vite"))(
    "esbuild",
  );
  if (!seedOnly)
    assert.ok(
      fs.existsSync(path.join(desktop, "out/main/index.js")),
      "Build the desktop first",
    );
  const work = fs.mkdtempSync(
    path.join(os.tmpdir(), "pond-gallery-performance-"),
  );
  const run = (script, extraArgs, env, name) => {
    const result = spawnSync(electron, [script, ...extraArgs], {
      cwd: desktop,
      env: {
        ...process.env,
        NODE_PATH: path.join(desktop, "node_modules"),
        ...env,
      },
      encoding: "utf8",
      timeout: 300000,
      killSignal: "SIGKILL",
      maxBuffer: 16 * 1024 * 1024,
    });
    fs.writeFileSync(
      path.join(output, `${name}.log`),
      `${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
    assert.equal(result.error, undefined, `${name}: ${result.error?.message}`);
    assert.equal(
      result.status,
      0,
      `${name} failed; see ${path.join(output, `${name}.log`)}`,
    );
  };
  try {
    const initializer = path.join(work, "initialize-schema.cjs");
    await esbuild.build({
      stdin: {
        contents: 'export { initializePondSchema } from "./src/main/db";',
        resolveDir: desktop,
        loader: "ts",
      },
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      outfile: initializer,
      alias: { "@shared": path.join(desktop, "src/shared") },
      plugins: [
        {
          name: "workspace-schema",
          setup(build) {
            build.onResolve({ filter: /^@pond\// }, (request) => ({
              path: requireDesktop.resolve(request.path),
            }));
          },
        },
      ],
    });
    const results = [];
    for (const size of sizes) {
      const sandbox = path.join(work, String(size));
      fs.mkdirSync(sandbox);
      fs.writeFileSync(
        path.join(sandbox, "gallery-fixture-owner.json"),
        JSON.stringify({ kind: "pond-gallery-performance", size }),
      );
      run(
        path.join(__dirname, "gallery-performance-seed.cjs"),
        [desktop, sandbox, String(size), initializer],
        { ELECTRON_RUN_AS_NODE: "1", POND_SANDBOX: sandbox },
        `seed-${size}`,
      );
      const fixture = JSON.parse(
        fs.readFileSync(path.join(sandbox, "fixture.json"), "utf8"),
      );
      fs.copyFileSync(
        path.join(sandbox, "fixture.json"),
        path.join(output, `fixture-${size}.json`),
      );
      if (seedOnly) {
        results.push(fixture);
        continue;
      }
      run(
        path.join(__dirname, "gallery-performance-measure.cjs"),
        [desktop],
        {
          ELECTRON_RUN_AS_NODE: "",
          POND_SANDBOX: sandbox,
          POND_PERF_SIZE: String(size),
        },
        `measure-${size}`,
      );
      results.push(
        JSON.parse(fs.readFileSync(path.join(sandbox, "result.json"), "utf8")),
      );
      fs.copyFileSync(
        path.join(sandbox, "gallery.png"),
        path.join(output, `gallery-${size}.png`),
      );
    }
    fs.writeFileSync(
      path.join(output, "results.json"),
      `${JSON.stringify({ seedOnly, results }, null, 2)}\n`,
    );
    console.log(
      `Gallery ${seedOnly ? "fixture verification" : "performance measurement"} passed: ${output}`,
    );
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
