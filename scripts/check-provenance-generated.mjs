import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(repository, "scripts/run-provenance.mjs");
const output = mkdtempSync(join(tmpdir(), "pond-provenance-"));
const generated = join(repository, "docs/provenance/generated");

try {
  const result = spawnSync(
    process.execPath,
    [cliPath, "generate", ".provenance", "--output-dir", output],
    { cwd: repository, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);

  for (const file of [
    "REFERENCES.md",
    "INFLUENCES.md",
    "provenance.prov.jsonld",
  ]) {
    assert.equal(
      readFileSync(join(generated, file), "utf8"),
      readFileSync(join(output, file), "utf8"),
      `${file} is stale; run pnpm provenance:generate`,
    );
  }

  console.log("Generated Provenance artifacts are up to date.");
} finally {
  rmSync(output, { recursive: true, force: true });
}
