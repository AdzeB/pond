import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrateSaveFileLayout } from "./save-file-layout-migration";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("migrateSaveFileLayout", () => {
  it("renames cover.jpg ahead of media-1 and writes a thumbnail sidecar", async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-layout-"));
    roots.push(root);
    const dir = join(root, "items", "save.info");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "cover.jpg"), pngBytes());
    await writeFile(join(dir, "media-1.jpg"), pngBytes());
    await writeFile(
      join(dir, "info.json"),
      JSON.stringify({
        schema: 3,
        id: "save",
        files: [
          { kind: "cover", path: "cover.jpg", sha256: "a", size: 1 },
          { kind: "media", path: "media-1.jpg", sha256: "b", size: 1 },
        ],
      }),
    );

    const result = await migrateSaveFileLayout(
      "save",
      [
        { kind: "cover", path: "cover.jpg", sha256: "a", size: 1 },
        { kind: "media", path: "media-1.jpg", sha256: "b", size: 1 },
      ],
      3,
      { root, persist: false },
    );

    expect(result.files.map((file) => file.path)).toEqual([
      "media-1.jpg",
      "media-2.jpg",
      "media-1.jpg_thumbnail.png",
    ]);
    expect(result.files.map((file) => file.kind)).toEqual([
      "image",
      "image",
      "thumbnail",
    ]);
    const info = JSON.parse(await readFile(join(dir, "info.json"), "utf8"));
    expect(info.schema).toBe(4);
    expect(info.files[0].path).toBe("media-1.jpg");
    expect(info.files[2].path).toBe("media-1.jpg_thumbnail.png");
  });

  it("writes a thumbnail sidecar when schema is current but none exists", async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-layout-"));
    roots.push(root);
    const dir = join(root, "items", "save.info");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "media-1.jpg"), pngBytes());
    await writeFile(
      join(dir, "info.json"),
      JSON.stringify({
        schema: 4,
        id: "save",
        files: [{ kind: "image", path: "media-1.jpg", sha256: "a", size: 1 }],
      }),
    );

    const result = await migrateSaveFileLayout(
      "save",
      [{ kind: "image", path: "media-1.jpg", sha256: "a", size: 1 }],
      4,
      { root, persist: false },
    );

    expect(result.changed).toBe(true);
    expect(result.files.map((file) => file.path)).toEqual([
      "media-1.jpg",
      "media-1.jpg_thumbnail.png",
    ]);
  });

  it("does not shift media files when cover.jpg is listed but missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-layout-"));
    roots.push(root);
    const dir = join(root, "items", "save.info");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "media-1.jpg"), pngBytes(1));
    await writeFile(join(dir, "media-2.jpg"), pngBytes(2));
    await writeFile(
      join(dir, "info.json"),
      JSON.stringify({
        schema: 3,
        id: "save",
        files: [
          { kind: "cover", path: "cover.jpg", sha256: "a", size: 1 },
          { kind: "image", path: "media-1.jpg", sha256: "b", size: 1 },
          { kind: "image", path: "media-2.jpg", sha256: "c", size: 1 },
        ],
      }),
    );

    const result = await migrateSaveFileLayout(
      "save",
      [
        { kind: "cover", path: "cover.jpg", sha256: "a", size: 1 },
        { kind: "image", path: "media-1.jpg", sha256: "b", size: 1 },
        { kind: "image", path: "media-2.jpg", sha256: "c", size: 1 },
      ],
      3,
      { root, persist: false },
    );

    expect(result.files.map((file) => file.path)).toEqual([
      "media-1.jpg",
      "media-2.jpg",
      "media-1.jpg_thumbnail.png",
    ]);
    expect(await readFile(join(dir, "media-1.jpg"))).toEqual(pngBytes(1));
  });

  it("restores a media-1 hole left by a skipped cover rename", async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-layout-"));
    roots.push(root);
    const dir = join(root, "items", "save.info");
    await mkdir(dir, { recursive: true });
    const first = pngBytes(1);
    const second = pngBytes(2);
    await writeFile(join(dir, "media-2.jpg"), first);
    await writeFile(join(dir, "media-3.jpg"), second);
    const firstSha = sha256(first);
    const secondSha = sha256(second);
    await writeFile(
      join(dir, "info.json"),
      JSON.stringify({
        schema: 4,
        id: "save",
        files: [
          {
            kind: "image",
            path: "media-1.jpg",
            sha256: firstSha,
            size: first.length,
          },
          {
            kind: "image",
            path: "media-2.jpg",
            sha256: secondSha,
            size: second.length,
          },
          {
            kind: "image",
            path: "media-3.jpg",
            sha256: "ghost",
            size: 1,
          },
        ],
      }),
    );

    const result = await migrateSaveFileLayout(
      "save",
      [
        {
          kind: "image",
          path: "media-1.jpg",
          sha256: firstSha,
          size: first.length,
        },
        {
          kind: "image",
          path: "media-2.jpg",
          sha256: secondSha,
          size: second.length,
        },
        { kind: "image", path: "media-3.jpg", sha256: "ghost", size: 1 },
      ],
      4,
      { root, persist: false },
    );

    expect(result.files.map((file) => file.path)).toEqual([
      "media-1.jpg",
      "media-2.jpg",
      "media-1.jpg_thumbnail.png",
    ]);
    expect(await readFile(join(dir, "media-1.jpg"))).toEqual(first);
    expect(await readFile(join(dir, "media-2.jpg"))).toEqual(second);
  });
});

function pngBytes(seed = 0): Buffer {
  return Buffer.concat([
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
    Buffer.from([seed]),
  ]);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
