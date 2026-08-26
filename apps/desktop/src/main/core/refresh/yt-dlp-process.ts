import { spawn } from "node:child_process";

export interface ProcOutcome {
  code: number;
  stdout: string;
  stderr: string;
}

export function runWithTimeout(
  bin: string,
  argv: string[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<ProcOutcome> {
  return new Promise((resolve) => {
    const child = spawn(bin, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let stdout = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanupAbort();
      try {
        child.kill("SIGKILL");
      } catch {}
      resolve({
        code: 124,
        stdout,
        stderr: `${stderr}\n[pond yt-dlp] timeout`,
      });
    }, timeoutMs);

    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill("SIGKILL");
      } catch {}
      resolve({
        code: 125,
        stdout,
        stderr: `${stderr}\n[pond yt-dlp] aborted`,
      });
    };
    const cleanupAbort = () => signal?.removeEventListener("abort", onAbort);
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 1_000_000) stdout = stdout.slice(-1_000_000);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 64_000) stderr = stderr.slice(-64_000);
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanupAbort();
      resolve({ code: -1, stdout, stderr: String(err) });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanupAbort();
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}
