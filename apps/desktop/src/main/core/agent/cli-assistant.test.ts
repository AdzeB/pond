import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { completeWithTools } from "./complete";

// Exercise the real process boundary and Pond tool loop without spending a plan's usage.
const fixture = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const codex = process.argv[1].endsWith('/codex');
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => stdin += chunk);
process.stdin.on('end', () => {
  if (process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY || process.env.ANTHROPIC_API_KEY)
    throw new Error('API credentials must not reach subscription processes');
  if (args[0] === 'login') {
    console.log(process.env.POND_CLI_AUTH === 'api' ? 'Logged in using an API key' : 'Logged in using ChatGPT'); return;
  }
  if (args[0] === 'auth') {
    console.log(JSON.stringify({loggedIn: true, authMethod: process.env.POND_CLI_AUTH === 'api' ? 'api_key' : 'claude.ai'})); return;
  }
  if (stdin.includes('hang-fixture')) {
    fs.writeFileSync(process.env.POND_CLI_PID, String(process.pid));
    setInterval(() => {}, 1000); return;
  }
  if (stdin.includes('fail-fixture')) process.exit(7);
  if (stdin.includes('malformed-fixture')) { console.log('not JSON'); return; }
  const request = JSON.parse(stdin);
  const hasResult = request.prompt.some(message => message.role === 'tool');
  const reply = hasResult
    ? {text: 'Found a saved article.', toolCalls: []}
    : {text: '', toolCalls: [{name: 'searchLibrary', arguments: '{"query":"design"}'}]};
  if (codex) {
    console.log(JSON.stringify({type: 'item.completed', item: {type: 'agent_message', text: JSON.stringify(reply)}}));
    console.log(JSON.stringify({type: 'turn.completed', usage: {input_tokens: 10, output_tokens: 10}}));
  } else console.log(JSON.stringify({type: 'result', is_error: false, structured_output: reply}));
});
`;

let directory = "";
const originalPath = process.env.PATH;
const originalKeys = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CODEX_API_KEY: process.env.CODEX_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "pond-cli-assistant-"));
  for (const name of ["codex", "claude"])
    await writeFile(join(directory, name), fixture, { mode: 0o755 });
  process.env.PATH = `${directory}:${originalPath}`;
  process.env.POND_CLI_PID = join(directory, "child.pid");
  for (const name of Object.keys(originalKeys))
    process.env[name] = "must-not-reach-subscription-child";
});

afterAll(async () => {
  process.env.PATH = originalPath;
  delete process.env.POND_CLI_PID;
  delete process.env.POND_CLI_AUTH;
  for (const [name, value] of Object.entries(originalKeys)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  await rm(directory, { recursive: true, force: true });
});

function run(
  provider: "codex" | "claude-code",
  content = "Find design",
  controller = new AbortController(),
) {
  const calls: string[] = [];
  let text = "";
  const result = completeWithTools({
    provider,
    model: "default",
    apiKey: null,
    messages: [{ role: "user", content }],
    context: "",
    tools: [
      {
        name: "searchLibrary",
        description: "Find saved articles.",
        schema: z.object({ query: z.string() }),
        execute: async (args) => {
          calls.push(z.string().parse(args.query));
          return { title: "A saved design article" };
        },
      },
    ],
    abortController: controller,
    onText: (delta) => {
      text += delta;
    },
    waitForTextChunk: async () => {},
  });
  return { result, calls, text: () => text };
}

describe("subscription assistant through real CLI processes", () => {
  it.each(["codex", "claude-code"] as const)(
    "rejects a saved API-key login for %s",
    async (provider) => {
      process.env.POND_CLI_AUTH = "api";
      try {
        const reply = run(provider);
        await expect(reply.result).rejects.toThrow(/sign in/i);
        expect(reply.calls).toEqual([]);
      } finally {
        delete process.env.POND_CLI_AUTH;
      }
    },
  );
  it.each(["codex", "claude-code"] as const)(
    "runs Pond tools and returns a reply with %s",
    async (provider) => {
      const reply = run(provider);
      await expect(reply.result).resolves.toBe("Found a saved article.");
      expect(reply.calls).toEqual(["design"]);
      expect(reply.text()).toBe("Found a saved article.");
    },
  );

  it.each(["fail-fixture", "malformed-fixture"])(
    "reports %s without inventing a reply",
    async (content) => {
      const reply = run("codex", content);
      await expect(reply.result).rejects.toThrow(
        content === "fail-fixture" ? /exited/ : /invalid/i,
      );
      expect(reply.calls).toEqual([]);
      expect(reply.text()).toBe("");
    },
  );

  it("stops the actual CLI process when a reply is cancelled", async () => {
    const controller = new AbortController();
    const reply = run("codex", "hang-fixture", controller);
    const rejected = expect(reply.result).rejects.toThrow();
    let pid = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      const stored = await readFile(join(directory, "child.pid"), "utf8").catch(
        () => "",
      );
      if (stored) {
        pid = Number(stored);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    controller.abort();
    await rejected;
    expect(pid).toBeGreaterThan(0);
    await expect
      .poll(() => {
        try {
          process.kill(pid, 0);
          return false;
        } catch {
          return true;
        }
      })
      .toBe(true);
    expect(reply.text()).toBe("");
  });
});
