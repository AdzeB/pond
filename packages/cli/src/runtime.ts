import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

async function ready(baseUrl: string, timeout: number): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/app/info`, {
      signal: AbortSignal.timeout(timeout),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function launchPond(platform = process.platform): void {
  const command =
    platform === "darwin"
      ? { file: "open", args: ["-gj", "-a", "Pond"] }
      : platform === "win32"
        ? {
            file: "cmd.exe",
            args: ["/d", "/s", "/c", "start", '""', "Pond"],
          }
        : { file: "gtk-launch", args: ["pond"] };
  const child = spawn(command.file, command.args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export async function ensurePondAvailable(
  baseUrl: string,
  timeout: number,
): Promise<void> {
  if (await ready(baseUrl, Math.min(timeout, 750))) return;
  launchPond();
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await delay(250);
    if (await ready(baseUrl, Math.min(750, deadline - Date.now()))) return;
  }
  throw new Error(
    "Pond did not start before the timeout. Open the app and try again.",
  );
}
