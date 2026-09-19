import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const maximumBytes = 16 * 1024 * 1024;
const events = {
  codex: {
    SessionStart: "session-start",
    SessionEnd: "session-end",
    UserPromptSubmit: "prompt",
    PreToolUse: "tool-start",
    PostToolUse: "tool-result",
    SubagentStart: "agent-start",
    SubagentStop: "agent-stop",
    PreCompact: "compaction-start",
    PostCompact: "compaction-end",
    Stop: "turn-stop",
    Interrupt: "interruption",
  },
  cursor: {
    sessionStart: "session-start",
    sessionEnd: "session-end",
    beforeSubmitPrompt: "prompt",
    preToolUse: "tool-start",
    postToolUse: "tool-result",
    postToolUseFailure: "tool-failure",
    beforeReadFile: "file-read",
    afterFileEdit: "file-edit",
    beforeTabFileRead: "file-read",
    afterTabFileEdit: "file-edit",
    subagentStart: "agent-start",
    subagentStop: "agent-stop",
    preCompact: "compaction-start",
    afterAgentResponse: "agent-response",
    stop: "turn-stop",
  },
};

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function textValue(value) {
  return value === String(value) && value.length > 0;
}

function plainRecord(value) {
  return (
    value !== null &&
    value !== undefined &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function contained(root, path) {
  const location = relative(root, path);
  return (
    location === "" ||
    (!location.startsWith(`..${sep}`) &&
      location !== ".." &&
      !location.startsWith(sep))
  );
}

function storageDirectory(root, ...segments) {
  let path = realpathSync(root);
  for (const segment of [".tmp", "references", ...segments]) {
    path = join(path, segment);
    mkdirSync(path, { mode: 0o700, recursive: true });
    assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink());
    if (segment !== ".tmp") chmodSync(path, 0o700);
  }
  return path;
}

function writePrivate(path, content) {
  const pending = `${path}.${randomUUID()}.pending`;
  try {
    writeFileSync(pending, content, { flag: "wx", mode: 0o600 });
    renameSync(pending, path);
  } finally {
    if (existsSync(pending)) unlinkSync(pending);
  }
}

function sourceCandidates(payload) {
  const urls = new Set();
  const queries = new Set();
  const files = new Set();
  const figma = new Set();
  const pending = [["", payload]];
  let inspected = 0;
  while (pending.length && inspected++ < 100000) {
    const [key, value] = pending.pop();
    if (textValue(value)) {
      if (
        ["tool_input", "tool_output", "tool_response", "result_json"].includes(
          key,
        )
      ) {
        try {
          const decoded = JSON.parse(value);
          if (plainRecord(decoded) || Array.isArray(decoded))
            pending.push([key, decoded]);
        } catch {
          // Some tools return prose instead of JSON; the text is still inspected below.
        }
      }
      if (["q", "query", "search_query"].includes(key)) queries.add(value);
      if (["file_path", "path", "file", "filePath"].includes(key))
        files.add(value);
      if (["fileKey", "file_key", "nodeId", "node_id", "version"].includes(key))
        figma.add(`${key}: ${value}`);
      for (const match of value.matchAll(/https?:\/\/[^\s<>"`\\]+/g)) {
        let candidate = match[0].replace(/[.,;\]]+$/, "");
        while (
          candidate.endsWith(")") &&
          (candidate.match(/\)/g)?.length ?? 0) >
            (candidate.match(/\(/g)?.length ?? 0)
        )
          candidate = candidate.slice(0, -1);
        try {
          const url = new URL(candidate);
          urls.add(url.href);
          if (
            url.hostname === "figma.com" ||
            url.hostname.endsWith(".figma.com")
          )
            figma.add(url.href);
        } catch {
          // Malformed tool text stays in the original payload for manual review.
        }
      }
    } else if (Array.isArray(value)) {
      for (const item of value) pending.push([key, item]);
    } else if (plainRecord(value)) {
      for (const entry of Object.entries(value)) pending.push(entry);
    }
  }
  return {
    files: [...files],
    figma: [...figma],
    queries: [...queries],
    truncated: pending.length > 0,
    urls: [...urls],
  };
}

export function captureEvent(
  root,
  tool,
  payload,
  receivedAt = new Date().toISOString(),
) {
  assert(Object.hasOwn(events, tool));
  assert(plainRecord(payload));
  assert(textValue(payload.hook_event_name));
  const rawSession =
    tool === "codex" ? payload.session_id : payload.conversation_id;
  const tabEvent = ["beforeTabFileRead", "afterTabFileEdit"].includes(
    payload.hook_event_name,
  );
  assert(textValue(rawSession) || (tool === "cursor" && tabEvent));
  const sourceRoot = realpathSync(root);
  const locations = tool === "codex" ? [payload.cwd] : payload.workspace_roots;
  assert(
    Array.isArray(locations) &&
      locations.some(
        (path) =>
          textValue(path) &&
          existsSync(path) &&
          contained(sourceRoot, realpathSync(path)),
      ),
  );
  const session = textValue(rawSession) ? rawSession : "unassigned-tab-session";
  const timestamp = textValue(payload.timestamp) ? payload.timestamp : null;
  const eventId =
    payload.event_id ?? payload.tool_use_id ?? payload.tool_call_id ?? null;
  const turnId = payload.turn_id ?? payload.generation_id ?? null;
  const kind = Object.hasOwn(events[tool], payload.hook_event_name)
    ? events[tool][payload.hook_event_name]
    : "unrecognized";
  const identity = JSON.stringify(
    [
      payload.hook_event_name,
      turnId,
      eventId,
      payload.agent_id ?? null,
      textValue(eventId) ? null : payload,
    ],
    (_key, value) =>
      plainRecord(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          )
        : value,
  );
  const hasIdentity =
    textValue(eventId) || textValue(timestamp) || textValue(turnId);
  const id = hasIdentity ? hash(identity) : randomUUID();
  const directory = storageDirectory(root, tool, hash(session));
  const path = join(directory, `${id}.json`);
  if (existsSync(path)) return path;
  const record = {
    candidates: sourceCandidates(payload),
    coverage: hasIdentity ? "provider-identity" : "delivery-identity-only",
    eventId,
    id,
    kind,
    model: payload.model_id ?? payload.model ?? null,
    payload,
    receivedAt,
    schemaVersion: 1,
    sessionId: session,
    timestamp,
    tool,
    turnId,
  };
  writePrivate(path, `${JSON.stringify(record)}\n`);
  return path;
}

export function hookResponse(tool, event) {
  if (tool === "cursor") {
    if (
      [
        "preToolUse",
        "beforeReadFile",
        "beforeTabFileRead",
        "subagentStart",
      ].includes(event)
    )
      return { permission: "allow" };
    if (event === "beforeSubmitPrompt") return { continue: true };
  }
  return {};
}

function eventFiles(root, options) {
  const base = join(root, ".tmp", "references");
  if (!existsSync(base)) return [];
  assert(!lstatSync(join(root, ".tmp")).isSymbolicLink());
  assert(lstatSync(base).isDirectory() && !lstatSync(base).isSymbolicLink());
  const found = [];
  for (const tool of Object.keys(events)) {
    if (options.tool && options.tool !== tool) continue;
    const directory = join(base, tool);
    if (!existsSync(directory)) continue;
    assert(
      lstatSync(directory).isDirectory() &&
        !lstatSync(directory).isSymbolicLink(),
    );
    for (const session of readdirSync(directory, { withFileTypes: true })) {
      if (!session.isDirectory() || !/^[a-f0-9]{64}$/.test(session.name))
        continue;
      if (
        options.session &&
        session.name !== options.session &&
        session.name !== hash(options.session)
      )
        continue;
      for (const file of readdirSync(join(directory, session.name), {
        withFileTypes: true,
      })) {
        if (file.isFile() && /^[a-f0-9-]+\.json$/.test(file.name))
          found.push(join(directory, session.name, file.name));
      }
    }
  }
  return found;
}

export function summarizeCapture(root, options = {}) {
  if (options.tool) assert(Object.hasOwn(events, options.tool));
  const records = [];
  let corrupt = 0;
  for (const path of eventFiles(root, options)) {
    try {
      assert(lstatSync(path).size <= maximumBytes * 3);
      const record = JSON.parse(readFileSync(path, "utf8"));
      assert(record.schemaVersion === 1 && Object.hasOwn(events, record.tool));
      assert(
        Object.values(events[record.tool]).includes(record.kind) ||
          record.kind === "unrecognized",
      );
      assert(!Number.isNaN(Date.parse(record.receivedAt)));
      const entry = {
        evidence: relative(root, path).split(sep).join("/"),
        id: path
          .split(sep)
          .at(-1)
          .replace(/\.json$/, ""),
        kind: record.kind,
        receivedAt: new Date(record.receivedAt).toISOString(),
        session: path.split(sep).at(-2),
        tool: record.tool,
      };
      if (options.evidence) entry.localEvidence = record;
      records.push(entry);
    } catch {
      corrupt++;
    }
  }
  records.sort(
    (left, right) =>
      left.receivedAt.localeCompare(right.receivedAt) ||
      left.id.localeCompare(right.id),
  );
  const counts = {};
  for (const record of records)
    counts[record.kind] = (counts[record.kind] ?? 0) + 1;
  return { corrupt, counts, records, total: records.length };
}

export function captureStatus(root, options = {}) {
  const summary = summarizeCapture(root, options);
  const failureDirectory = join(root, ".tmp", "references", "failures");
  const failures =
    existsSync(failureDirectory) &&
    !lstatSync(failureDirectory).isSymbolicLink()
      ? readdirSync(failureDirectory).filter((file) =>
          /^(codex|cursor)-[a-f0-9-]+\.json$/.test(file),
        )
      : [];
  return {
    corrupt: summary.corrupt,
    tools: Object.keys(events)
      .filter((tool) => !options.tool || options.tool === tool)
      .map((tool) => {
        const records = summary.records.filter(
          (record) => record.tool === tool,
        );
        const configured = existsSync(join(root, `.${tool}`, "hooks.json"));
        const failedEvents = failures.filter((file) =>
          file.startsWith(`${tool}-`),
        ).length;
        return {
          configured,
          events: records.length,
          failedEvents,
          latestEvent: records.at(-1)?.receivedAt ?? null,
          status:
            summary.corrupt || failedEvents
              ? "degraded"
              : records.length
                ? "observed-partial"
                : "not-observed",
          tool,
        };
      }),
    warnings: [
      "Hook configuration does not prove client activation or trust. Verify using a fresh controlled client session.",
      "Hosted searches and unexposed inputs require an agent record. Observed events never establish complete coverage.",
      "Raw evidence stays local. Do not copy prompts, responses, or private material into Git.",
    ],
  };
}

async function inputJson() {
  const chunks = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    assert(length <= maximumBytes);
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "capture") {
    const [tool, event] = args;
    let payload;
    try {
      payload = await inputJson();
      captureEvent(repository, tool, payload);
    } catch {
      process.stderr.write(
        "Reference capture degraded: event could not be recorded. Local coverage is incomplete for this event.\n",
      );
      try {
        if (Object.hasOwn(events, tool)) {
          const directory = storageDirectory(repository, "failures");
          writePrivate(
            join(directory, `${tool}-${randomUUID()}.json`),
            `${JSON.stringify({ receivedAt: new Date().toISOString(), tool })}\n`,
          );
        }
      } catch {
        process.stderr.write(
          "Reference capture could not persist its failure marker; local coverage is unknown.\n",
        );
      }
    }
    process.stdout.write(
      `${JSON.stringify(hookResponse(tool, event ?? payload?.hook_event_name))}\n`,
    );
    return;
  }
  assert(
    ["summary", "status"].includes(command),
    "Use capture, summary, or status.",
  );
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (option === "--evidence" && command === "summary")
      options.evidence = true;
    else if (["--tool", "--session"].includes(option)) {
      assert(
        args[index + 1] && !args[index + 1].startsWith("--"),
        "Missing option value.",
      );
      options[option.slice(2)] = args[++index];
    } else throw new Error("Unsupported option.");
  }
  const result =
    command === "summary"
      ? summarizeCapture(repository, options)
      : captureStatus(repository, options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch(() => {
    process.stderr.write(
      "Reference command failed. Check arguments and local capture storage permissions.\n",
    );
    process.exitCode = 1;
  });
}
