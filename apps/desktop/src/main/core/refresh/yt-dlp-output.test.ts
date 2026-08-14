import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { pickProducedFiles } from "./yt-dlp-output";

describe("pickProducedFiles", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  it("keeps playlist order even when a later clip is larger", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pond-ytdlp-out-"));
    dirs.push(dir);
    await writeFile(join(dir, "quoted.mp4"), Buffer.alloc(200));
    await writeFile(
      join(dir, "quoted.info.json"),
      JSON.stringify({ id: "quoted", playlist_index: 2 }),
    );
    await writeFile(join(dir, "parent.mp4"), Buffer.alloc(50));
    await writeFile(
      join(dir, "parent.info.json"),
      JSON.stringify({ id: "parent", playlist_index: 1 }),
    );

    const files = await pickProducedFiles(dir);
    expect(files.map((f) => f.infoJson?.id)).toEqual(["parent", "quoted"]);
  });
});
