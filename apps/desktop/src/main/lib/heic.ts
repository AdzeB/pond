import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Quick Look can successfully return a generic file icon for a valid HEIC. */
export async function decodeHeicOnMac(
  sourcePath: string,
  width: number,
): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "pond-heic-"));
  const output = join(directory, "preview.png");
  try {
    await execFileAsync(
      "/usr/bin/sips",
      ["-s", "format", "png", "-Z", String(width), sourcePath, "--out", output],
      { timeout: 30_000 },
    );
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
