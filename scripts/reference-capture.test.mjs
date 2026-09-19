import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  captureEvent,
  captureStatus,
  hookResponse,
  summarizeCapture,
} from "./reference-capture.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "pond-references-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const scripts = join(root, "scripts");
  mkdirSync(scripts);
  copyFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "reference-capture.mjs"),
    join(scripts, "reference-capture.mjs"),
  );
  return root;
}

function codex(root, extra = {}) {
  return {
    cwd: root,
    hook_event_name: "UserPromptSubmit",
    model: "fixture-model",
    prompt: "Private product requirements",
    session_id: "fixture-session",
    turn_id: "turn-1",
    ...extra,
  };
}

function cursor(root, extra = {}) {
  return {
    conversation_id: "fixture-cursor",
    generation_id: "generation-1",
    hook_event_name: "beforeSubmitPrompt",
    model: "fixture-model",
    prompt: "Private product requirements",
    workspace_roots: [root],
    ...extra,
  };
}

function runCapture(root, tool, event, input) {
  return spawnSync(
    process.execPath,
    [join(root, "scripts/reference-capture.mjs"), "capture", tool, event],
    { encoding: "utf8", input },
  );
}

test("captures prompts from both clients and keeps private fields out of default summaries", (t) => {
  const root = fixture(t);
  for (const [tool, payload] of [
    ["codex", codex(root)],
    ["cursor", cursor(root)],
  ]) {
    const path = captureEvent(root, tool, payload);
    assert.equal(
      JSON.parse(readFileSync(path, "utf8")).payload.prompt,
      payload.prompt,
    );
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(statSync(dirname(path)).mode & 0o777, 0o700);
  }
  const summary = summarizeCapture(root);
  assert.equal(summary.records.length, 2);
  assert.equal(summary.total, 2);
  assert.deepEqual(summary.counts, { prompt: 2 });
  assert(!JSON.stringify(summary).includes("Private product requirements"));
  assert(!JSON.stringify(summary).includes("fixture-model"));
  assert(!JSON.stringify(summary).includes("fixture-session"));
  assert.equal(
    summarizeCapture(root, { evidence: true, tool: "codex" }).records[0]
      .localEvidence.payload.prompt,
    "Private product requirements",
  );
});

test("extracts search and Figma candidates while preserving untrusted status and raw identifiers", (t) => {
  const root = fixture(t);
  const payload = cursor(root, {
    hook_event_name: "postToolUse",
    tool_use_id: "call-1",
    tool_input: JSON.stringify({
      query: "private layout query",
      fileKey: "figma-file",
      nodeId: "1:2",
      version: "version-3",
    }),
    tool_output: JSON.stringify({
      url: "https://www.figma.com/design/figma-file/Layout?node-id=1-2&token=private-token",
      citation: "https://example.com/reference",
    }),
  });
  captureEvent(root, "cursor", payload);
  const record = summarizeCapture(root, { evidence: true }).records[0]
    .localEvidence;
  assert.equal(record.eventId, "call-1");
  assert.deepEqual(record.candidates.queries, ["private layout query"]);
  assert(record.candidates.figma.includes("nodeId: 1:2"));
  assert(record.candidates.urls.includes("https://example.com/reference"));
  assert(!JSON.stringify(summarizeCapture(root)).includes("private-token"));
  assert(!JSON.stringify(summarizeCapture(root)).includes("example.com"));
});

test("deduplicates repeated delivery and distinguishes pre/post and separate turns", (t) => {
  const root = fixture(t);
  const payload = codex(root, {
    hook_event_name: "PreToolUse",
    tool_use_id: "call-2",
    tool_input: { command: "pwd" },
  });
  const first = captureEvent(
    root,
    "codex",
    payload,
    "2026-09-14T10:00:00.000Z",
  );
  assert.equal(
    captureEvent(root, "codex", payload, "2026-09-14T10:00:01.000Z"),
    first,
  );
  captureEvent(root, "codex", {
    ...payload,
    hook_event_name: "PostToolUse",
    tool_response: "result",
  });
  captureEvent(root, "codex", { ...payload, turn_id: "turn-2" });
  const summary = summarizeCapture(root);
  assert.equal(summary.records.length, 3);
  assert.equal(summary.records[0].receivedAt, "2026-09-14T10:00:00.000Z");
});

test("preserves repeated lifecycle events when the provider supplies no unique identity", (t) => {
  const root = fixture(t);
  const payload = {
    cwd: root,
    session_id: "session",
    hook_event_name: "SessionStart",
  };
  captureEvent(root, "codex", payload);
  captureEvent(root, "codex", payload);
  const summary = summarizeCapture(root, { evidence: true });
  assert.equal(summary.records.length, 2);
  assert.equal(
    summary.records[0].localEvidence.coverage,
    "delivery-identity-only",
  );
});

test("captures failures, interruptions, and inline completion edits", (t) => {
  const root = fixture(t);
  captureEvent(root, "codex", codex(root, { hook_event_name: "Interrupt" }));
  captureEvent(
    root,
    "cursor",
    cursor(root, {
      hook_event_name: "postToolUseFailure",
      error_message: "fixture failure",
    }),
  );
  captureEvent(root, "cursor", {
    workspace_roots: [root],
    hook_event_name: "afterTabFileEdit",
    file_path: "src/file.ts",
  });
  assert.deepEqual(
    summarizeCapture(root)
      .records.map((record) => record.kind)
      .sort(),
    ["file-edit", "interruption", "tool-failure"],
  );
});

test("rejects out-of-repository and malformed events before persisting payloads", (t) => {
  const root = fixture(t);
  for (const payload of [
    null,
    [],
    {},
    codex(root, { cwd: tmpdir() }),
    codex(root, { session_id: null }),
  ])
    assert.throws(() => captureEvent(root, "codex", payload));
  assert.equal(summarizeCapture(root).records.length, 0);
});

test("uses hashed paths even for hostile session IDs", (t) => {
  const root = fixture(t);
  captureEvent(
    root,
    "codex",
    codex(root, { session_id: "../../../secret-token" }),
  );
  const summary = summarizeCapture(root, { session: "../../../secret-token" });
  assert.equal(summary.records.length, 1);
  assert(!JSON.stringify(summary).includes("secret-token"));
});

test("refuses symlinked local storage", (t) => {
  const root = fixture(t);
  const other = fixture(t);
  symlinkSync(other, join(root, ".tmp"));
  assert.throws(() => captureEvent(root, "codex", codex(root)));
});

test("handles concurrent first deliveries without losing distinct events", async (t) => {
  const root = fixture(t);
  await Promise.all(
    Array.from(
      { length: 12 },
      (_, index) =>
        new Promise((resolve, reject) => {
          const child = spawn(
            process.execPath,
            [
              join(root, "scripts/reference-capture.mjs"),
              "capture",
              "codex",
              "UserPromptSubmit",
            ],
            { stdio: ["pipe", "pipe", "pipe"] },
          );
          let error = "";
          child.stderr.on("data", (chunk) => {
            error += chunk;
          });
          child.on("error", reject);
          child.on("close", (code) =>
            code === 0 && error === ""
              ? resolve()
              : reject(new Error(`Capture failed: ${error}`)),
          );
          child.stdin.end(
            JSON.stringify(codex(root, { turn_id: `turn-${index}` })),
          );
        }),
    ),
  );
  assert.equal(summarizeCapture(root).records.length, 12);
});

test("malformed stdin fails open and persists a non-sensitive degraded marker", (t) => {
  const root = fixture(t);
  const result = runCapture(
    root,
    "cursor",
    "preToolUse",
    "secret-invalid-json",
  );
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { permission: "allow" });
  assert.match(result.stderr, /degraded/);
  assert(!result.stderr.includes("secret-invalid-json"));
  const status = captureStatus(root, { tool: "cursor" });
  assert.equal(status.tools[0].status, "degraded");
  assert.equal(status.tools[0].failedEvents, 1);
});

test("valid prompt hooks return allow responses even when capture scope is invalid", (t) => {
  const root = fixture(t);
  const result = runCapture(
    root,
    "cursor",
    "beforeSubmitPrompt",
    JSON.stringify(cursor(root, { workspace_roots: [tmpdir()] })),
  );
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { continue: true });
  assert.equal(summarizeCapture(root).records.length, 0);
  assert.deepEqual(hookResponse("codex", "Stop"), {});
});

test("reports corruption and observed events without asserting complete coverage", (t) => {
  const root = fixture(t);
  assert.equal(captureStatus(root).tools[0].status, "not-observed");
  const path = captureEvent(root, "codex", codex(root));
  assert.equal(
    captureStatus(root, { tool: "codex" }).tools[0].status,
    "observed-partial",
  );
  writeFileSync(path, "incomplete event");
  assert.equal(captureStatus(root).tools[0].status, "degraded");
  assert.equal(summarizeCapture(root).corrupt, 1);
});

test("deduplicates provider events and fallback payloads independently of key order", (t) => {
  const root = fixture(t);
  const original = codex(root, {
    tool_use_id: "unique-event",
    hook_event_name: "PostToolUse",
    tool_response: { a: 1, b: 2 },
  });
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  const first = captureEvent(root, "codex", original);
  assert.equal(captureEvent(root, "codex", reordered), first);
  const prompt = codex(root);
  assert.equal(
    captureEvent(root, "codex", prompt),
    captureEvent(
      root,
      "codex",
      Object.fromEntries(Object.entries(prompt).reverse()),
    ),
  );
  assert.equal(summarizeCapture(root).records.length, 2);
});

test("preserves balanced URL parentheses and trims Markdown delimiters", (t) => {
  const root = fixture(t);
  captureEvent(
    root,
    "codex",
    codex(root, {
      prompt: "See [Source](https://example.com/wiki/Topic_(term)).",
    }),
  );
  assert.deepEqual(
    summarizeCapture(root, { evidence: true }).records[0].localEvidence
      .candidates.urls,
    ["https://example.com/wiki/Topic_(term)"],
  );
});

test("large tool results are retained while candidate extraction reports its bound", (t) => {
  const root = fixture(t);
  const tool_response = Object.fromEntries(
    Array.from({ length: 150000 }, (_, index) => [`field-${index}`, "value"]),
  );
  captureEvent(
    root,
    "codex",
    codex(root, { hook_event_name: "PostToolUse", tool_response }),
  );
  const record = summarizeCapture(root, { evidence: true }).records[0]
    .localEvidence;
  assert.equal(record.payload.tool_response["field-149999"], "value");
  assert.equal(record.candidates.truncated, true);
});

test("the public API can be imported from a stdin module", (t) => {
  const root = fixture(t);
  const result = spawnSync(process.execPath, ["--input-type=module", "-"], {
    cwd: root,
    encoding: "utf8",
    input:
      "import { summarizeCapture } from './scripts/reference-capture.mjs'; console.log(summarizeCapture(process.cwd()).records.length);",
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "0");
});
