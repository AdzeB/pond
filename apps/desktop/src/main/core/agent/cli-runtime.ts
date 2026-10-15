import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import which from "which";
import { z } from "zod";
import type { OkResult } from "../../../shared/query-contracts-shared";

export type CliProvider = "codex" | "claude-code";

export function isCliProvider(provider: string): provider is CliProvider {
  return provider === "codex" || provider === "claude-code";
}

function commandFor(provider: CliProvider) {
  return provider === "codex" ? "codex" : "claude";
}

function loginHint(provider: CliProvider) {
  return provider === "codex"
    ? "Run codex login in Terminal and sign in with ChatGPT."
    : "Run claude auth login in Terminal and sign in with your Claude plan.";
}

async function cliEnvironment() {
  const nvm = join(homedir(), ".nvm/versions/node");
  const versions = await readdir(nvm).catch(() => []);
  const env = { ...process.env };
  // Subscription connections must never silently use inherited API billing.
  for (const key of [
    "OPENAI_API_KEY",
    "CODEX_API_KEY",
    "OPENAI_BASE_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_BASE_URL",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CODE_USE_BEDROCK",
    "CLAUDE_CODE_USE_VERTEX",
    "CLAUDE_CODE_USE_FOUNDRY",
    "CLAUDECODE",
  ])
    delete env[key];
  env.PATH = [
    env.PATH ?? "",
    join(homedir(), ".local/bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    ...versions
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((version) => join(nvm, version, "bin")),
  ].join(delimiter);
  return env;
}

export async function runCli(input: {
  provider: CliProvider;
  args: string[];
  cwd: string;
  stdin?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<{ stdout: string; stderr: string; code: number | null }> {
  input.signal?.throwIfAborted();
  const env = await cliEnvironment();
  const command = commandFor(input.provider);
  const executable = await which(command, { path: env.PATH }).catch(() => null);
  if (!executable)
    throw new Error(`Install ${command} first. ${loginHint(input.provider)}`);
  input.signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, input.args, {
      cwd: input.cwd,
      env,
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let failure: Error | undefined;
    let forceKill: ReturnType<typeof setTimeout> | undefined;
    const kill = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        if (process.platform !== "win32") process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        /* The process group may already have exited. */
      }
    };
    const stop = (error: Error) => {
      failure ??= error;
      kill("SIGTERM");
      forceKill ??= setTimeout(() => kill("SIGKILL"), 2_000);
      forceKill.unref();
    };
    const abort = () => stop(new Error("Reply cancelled."));
    const timer = setTimeout(
      () => stop(new Error(`${command} timed out. Try again.`)),
      input.timeoutMs ?? 5 * 60_000,
    );
    input.signal?.addEventListener("abort", abort, { once: true });
    if (input.signal?.aborted) abort();
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    const collect = (data: string, output: "stdout" | "stderr") => {
      bytes += Buffer.byteLength(data);
      if (bytes > 8 * 1024 * 1024) {
        stop(new Error(`${command} returned too much output.`));
        return;
      }
      if (output === "stdout") stdout += data;
      else stderr += data;
    };
    child.stdout.on("data", (data: string) => collect(data, "stdout"));
    child.stderr.on("data", (data: string) => collect(data, "stderr"));
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EPIPE") stop(error);
    });
    child.on("error", (error) => {
      failure = error;
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (forceKill) clearTimeout(forceKill);
      input.signal?.removeEventListener("abort", abort);
      if (failure) reject(failure);
      else resolve({ stdout, stderr, code });
    });
    child.stdin.end(input.stdin ?? "");
  });
}

export async function checkCliConnection(
  provider: CliProvider,
  signal?: AbortSignal,
): Promise<OkResult> {
  try {
    const result = await runCli({
      provider,
      cwd: homedir(),
      timeoutMs: 15_000,
      signal,
      args:
        provider === "codex"
          ? ["login", "status"]
          : ["auth", "status", "--json"],
    });
    if (provider === "codex") {
      if (
        result.code === 0 &&
        /logged in using ChatGPT/i.test(`${result.stdout}\n${result.stderr}`)
      )
        return { ok: true };
    } else {
      const auth = z
        .object({ loggedIn: z.boolean(), authMethod: z.string() })
        .safeParse(JSON.parse(result.stdout || "null"));
      if (
        result.code === 0 &&
        auth.success &&
        auth.data.loggedIn &&
        ["claude.ai", "oauth_token"].includes(auth.data.authMethod)
      )
        return { ok: true };
    }
    return { ok: false, error: loginHint(provider) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : loginHint(provider),
    };
  }
}
