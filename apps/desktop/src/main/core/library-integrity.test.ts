import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  type IntegritySave,
  inspectSaveIntegrity,
  type LibraryIntegrityRuntime,
  libraryIntegrityRuntime,
} from "./library-integrity";
import { writeLibraryMedia } from "./storage/library-media-storage";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pond-library-repair-"));
  roots.push(root);
  await mkdir(join(root, "items", "save-1.info"), { recursive: true });
  return root;
}

function fixtureSave(files: IntegritySave["files"]): IntegritySave {
  return {
    id: "save-1",
    title: "Fixture",
    source: "web",
    sourceId: "fixture",
    url: "https://example.com/fixture",
    files,
  };
}

function runtime(root: string): LibraryIntegrityRuntime {
  return {
    ...libraryIntegrityRuntime,
    root: () => root,
    listSaves: async () => [],
    getSave: async () => null,
  };
}

function file(kind: string, path: string, bytes: Uint8Array) {
  return {
    kind,
    path,
    size: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

describe("Library integrity repair previews", () => {
  it("preserves a verified custom thumbnail in a plaintext fixture", async () => {
    const root = await fixtureRoot();
    const directory = join(root, "items", "save-1.info");
    const original = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 3,
        background: "#336699",
      },
    })
      .png()
      .toBuffer();
    const custom = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 3,
        background: "#993366",
      },
    })
      .png()
      .toBuffer();
    await Promise.all([
      writeFile(join(directory, "photo.png"), original),
      writeFile(join(directory, "photo.png_thumbnail.png"), custom),
    ]);
    const row = fixtureSave([
      file("image", "photo.png", original),
      file("thumbnail", "photo.png_thumbnail.png", custom),
    ]);

    await expect(
      inspectSaveIntegrity({
        kind: "thumbnails",
        row,
        runtime: runtime(root),
      }),
    ).resolves.toBeNull();
  });

  it("reads payloads before offering metadata recovery", async () => {
    const root = await fixtureRoot();
    const directory = join(root, "items", "save-1.info");
    const payload = Buffer.from("verified payload");
    const row = fixtureSave([file("other", "payload.bin", payload)]);
    await writeLibraryMedia(join(directory, "payload.bin"), payload);
    const infoPath = join(directory, "info.json");
    await writeFile(infoPath, Buffer.from("{not-json"));

    const issue = await inspectSaveIntegrity({
      kind: "save-metadata",
      row,
      runtime: runtime(root),
    });

    expect(issue).toMatchObject({
      kind: "save-metadata",
      saveId: "save-1",
      summary: "Save record is out of date",
    });
  });

  it("never offers metadata recovery when a payload hash is stale", async () => {
    const root = await fixtureRoot();
    const directory = join(root, "items", "save-1.info");
    const expected = Buffer.from("expected");
    await writeFile(join(directory, "payload.bin"), Buffer.from("changed!"));
    const row = fixtureSave([file("other", "payload.bin", expected)]);

    await expect(
      inspectSaveIntegrity({
        kind: "save-metadata",
        row,
        runtime: runtime(root),
      }),
    ).resolves.toBeNull();
  });

  it("plans safe physical names without changing the Save title", async () => {
    const root = await fixtureRoot();
    const directory = join(root, "items", "save-1.info");
    const payload = Buffer.from("payload");
    await writeFile(join(directory, "bad:name.txt"), payload);
    const row = fixtureSave([file("other", "bad:name.txt", payload)]);

    const issue = await inspectSaveIntegrity({
      kind: "physical-file-names",
      row,
      runtime: runtime(root),
    });

    expect(issue?.title).toBe("Fixture");
    expect(issue?.action).toEqual({
      kind: "physical-file-names",
      renames: [{ from: "bad:name.txt", to: "bad-name.txt" }],
    });
  });
});
