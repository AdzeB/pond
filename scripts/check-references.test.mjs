import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { checkReferences } from "./check-references.mjs";

const citation =
  '<a id="example-2026"></a>\n\nExample. (2026). *Research*. [Research](https://example.com/research).\n';
const influence =
  "[Example (2026)](../../references.md#example-2026) informed the example workflow.\n";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "pond-references-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, content) => {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  write("references.md", `# References\n\n${citation}`);
  write("AGENTS.md", "# Instructions\n\n[References](references.md)\n");
  write("CONTRIBUTING.md", "# Contributing\n");
  write("docs/contributing/references-standard.md", "# Standard\n");
  write("docs/references/influences.md", `# Influences\n\n${influence}`);
  return { root, write };
}

test("accepts a cited bibliography and influence index", (t) => {
  const { root } = fixture(t);
  assert.deepEqual(checkReferences(root), []);
});

test("rejects duplicate stable identifiers and duplicate bibliography URLs", (t) => {
  const { root, write } = fixture(t);
  write("references.md", `# References\n\n${citation}\n${citation}`);
  const errors = checkReferences(root);
  assert.ok(
    errors.some((error) => error.includes("duplicate anchor example-2026")),
  );
  assert.ok(errors.some((error) => error.includes("duplicate source URL")));
});

test("keeps distinct source sections and nested URL parentheses intact", (t) => {
  const { root, write } = fixture(t);
  write(
    "references.md",
    `${citation}\n<a id="second"></a>\n\nExample. (2026). [Section](https://example.com/research#section).\n\n<a id="third"></a>\n\nExample. (2026). [Entry](https://example.com/entry_(reference)).\n`,
  );
  write(
    "docs/references/influences.md",
    `${influence}[Second](../../references.md#second) and [Third](../../references.md#third).\n`,
  );
  assert.deepEqual(checkReferences(root), []);
});

test("rejects broken targets and fragments without inspecting unrelated links", (t) => {
  const { root, write } = fixture(t);
  write(
    "docs/references/influences.md",
    `${influence}[Missing](missing.md)\n[Fragment](../../references.md#absent)\n[Context](../context.md#valid)\n`,
  );
  write("docs/context.md", "# Valid\n\n[Unrelated](absent.md)\n");
  const errors = checkReferences(root);
  assert.equal(errors.length, 2);
  assert.ok(
    errors.some((error) => error.includes("missing local target missing.md")),
  );
  assert.ok(
    errors.some((error) =>
      error.includes("missing fragment ../../references.md#absent"),
    ),
  );
});

test("requires an influence or inventory citation for every bibliography entry", (t) => {
  const { root, write } = fixture(t);
  write("docs/references/influences.md", "# Influences\n");
  write(
    "docs/contributing/references-standard.md",
    "[Example](../../references.md#example-2026)\n",
  );
  assert.ok(
    checkReferences(root).some((error) => error.includes("is not cited")),
  );
  write("docs/references/influences.md", influence);
  assert.deepEqual(checkReferences(root), []);
});

test("accepts inventory citations documenting dependency purpose", (t) => {
  const { root, write } = fixture(t);
  write("docs/references/influences.md", "# Influences\n");
  assert.ok(
    checkReferences(root).some((error) => error.includes("is not cited")),
  );
  write(
    "docs/references/inventory.md",
    "# Inventory\n\n[Example (2026)](../../references.md#example-2026) supplies the product's document parser.\n",
  );
  assert.deepEqual(checkReferences(root), []);
});

test("resolves source citations with nested brackets in social author labels", (t) => {
  const { root, write } = fixture(t);
  write(
    "docs/references/influences.md",
    "[Example [@example], 2026](../../references.md#example-2026) informed the example workflow.\n",
  );
  assert.deepEqual(checkReferences(root), []);
  write(
    "docs/references/influences.md",
    "[Other [@other], n.d.](../../references.md#absent)",
  );
  assert.ok(
    checkReferences(root).some((error) => error.includes("missing fragment")),
  );
});

test("runs the CLI when invoked through a symlink", (t) => {
  const { root, write } = fixture(t);
  write(
    "scripts/check-references.mjs",
    readFileSync(new URL("./check-references.mjs", import.meta.url), "utf8"),
  );
  const entry = join(root, "validator.mjs");
  symlinkSync(join(root, "scripts/check-references.mjs"), entry);
  const result = spawnSync(process.execPath, [entry], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed offline validation/);
});

test("ignores links and anchors inside backtick and tilde fenced examples", (t) => {
  const { root, write } = fixture(t);
  write(
    "references.md",
    `${citation}\n\`\`\`\`md\n${citation}\n[Broken](missing.md)\n\`\`\`\n[Still fenced](also-missing.md)\n\`\`\`\`\n\n~~~md\n${citation}\n[Broken](missing.md)\n~~~\n`,
  );
  assert.deepEqual(checkReferences(root), []);
});

test("supports Github heading fragments, repeated headings, and reference links", (t) => {
  const { root, write } = fixture(t);
  write(
    "docs/references/influences.md",
    `${influence}[Context](../context.md#café-an-example)\n[Repeated](../context.md#café-an-example-1)\n[Setext][setext]\n\n[setext]: <../context.md#setext-heading>\n`,
  );
  write(
    "docs/context.md",
    "# Café: an *example*!\n\n# Café: an *example*!\n\nSetext heading\n--------------\n",
  );
  assert.deepEqual(checkReferences(root), []);
});

test("rejects absolute paths, encoded traversal, symlink escapes, and malformed encodings", (t) => {
  const { root, write } = fixture(t);
  symlinkSync(tmpdir(), join(root, "outside"));
  write(
    "docs/references/influences.md",
    `${influence}[Private](/private/tmp/private.md)\n[Escape](../../../private.md)\n[Encoded](%2Fprivate%2Ftmp)\n[Symlink](../../outside)\n[Malformed](%invalid)\n`,
  );
  const errors = checkReferences(root);
  assert.equal(errors.length, 5);
  assert.ok(errors.some((error) => error.includes("nonportable local link")));
  assert.ok(
    errors.some((error) =>
      error.includes("escapes repository through a symlink"),
    ),
  );
  assert.ok(errors.some((error) => error.includes("malformed link encoding")));
});

test("reports missing required documents", (t) => {
  const { root } = fixture(t);
  rmSync(join(root, "references.md"));
  assert.ok(
    checkReferences(root).some((error) =>
      error.includes("Missing required reference document: references.md"),
    ),
  );
});

test("reports malformed source URLs as validation findings", (t) => {
  const { root, write } = fixture(t);
  write(
    "references.md",
    citation.replace("https://example.com/research", "https://[invalid"),
  );
  assert.ok(
    checkReferences(root).some((error) => error.includes("invalid source URL")),
  );
});
