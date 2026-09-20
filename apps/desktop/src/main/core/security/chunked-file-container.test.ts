import { randomBytes } from "node:crypto";
import {
  appendFile,
  mkdtemp,
  open,
  readFile,
  rm,
  stat,
  truncate,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  decryptFileContainer,
  encryptBufferContainer,
  encryptFileContainer,
  readFileContainerMetadata,
  readFileContainerRange,
} from "./chunked-file-container";

const HEADER_BYTES = 56;
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(name: string, bytes: Uint8Array) {
  const root = await mkdtemp(join(tmpdir(), `pond-file-container-${name}-`));
  roots.push(root);
  const inputPath = join(root, "input.bin");
  const encryptedPath = join(root, "encrypted.pond");
  const outputPath = join(root, "output.bin");
  const key = randomBytes(32);
  await writeFile(inputPath, bytes);
  return { root, inputPath, encryptedPath, outputPath, key };
}

async function collect(chunks: AsyncIterable<Buffer>): Promise<Buffer> {
  const collected: Buffer[] = [];
  for await (const chunk of chunks) collected.push(chunk);
  return Buffer.concat(collected);
}

async function flipByte(path: string, position: number): Promise<void> {
  const handle = await open(path, "r+");
  try {
    const byte = Buffer.alloc(1);
    await handle.read(byte, 0, 1, position);
    byte.writeUInt8(byte.readUInt8(0) ^ 0x80);
    await handle.write(byte, 0, 1, position);
  } finally {
    await handle.close();
  }
}

describe("chunked file container", () => {
  it("round-trips a multi-chunk file with versioned metadata", async () => {
    const bytes = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
    const paths = await fixture("round-trip", bytes);

    await expect(
      encryptFileContainer({
        inputPath: paths.inputPath,
        outputPath: paths.encryptedPath,
        key: paths.key,
        chunkSize: 8,
      }),
    ).resolves.toEqual({
      version: 1,
      originalSize: bytes.byteLength,
      chunkSize: 8,
      chunkCount: 5,
    });
    const encoded = await readFile(paths.encryptedPath);
    expect(encoded.subarray(0, 8).toString("ascii")).toBe("PONDFILE");
    expect(encoded.includes(bytes)).toBe(false);

    await decryptFileContainer({
      inputPath: paths.encryptedPath,
      outputPath: paths.outputPath,
      key: paths.key,
    });
    expect(await readFile(paths.outputPath)).toEqual(bytes);
  });

  it("encrypts in-memory bytes without a plaintext staging file", async () => {
    const bytes = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
    const paths = await fixture("buffer", Buffer.alloc(0));

    await encryptBufferContainer({
      bytes,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 8,
    });

    expect(
      await collect(
        readFileContainerRange({
          path: paths.encryptedPath,
          key: paths.key,
          start: 0,
          endExclusive: bytes.byteLength,
        }),
      ),
    ).toEqual(bytes);
  });

  it("supports empty files", async () => {
    const paths = await fixture("empty", Buffer.alloc(0));
    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 8,
    });

    await expect(
      readFileContainerMetadata({
        path: paths.encryptedPath,
        key: paths.key,
      }),
    ).resolves.toMatchObject({ originalSize: 0, chunkCount: 0 });
    await expect(
      collect(
        readFileContainerRange({
          path: paths.encryptedPath,
          key: paths.key,
          start: 0,
          endExclusive: 0,
        }),
      ),
    ).resolves.toEqual(Buffer.alloc(0));

    await decryptFileContainer({
      inputPath: paths.encryptedPath,
      outputPath: paths.outputPath,
      key: paths.key,
    });
    expect((await stat(paths.outputPath)).size).toBe(0);
  });

  it("streams ranges that cross chunks and one-byte ranges", async () => {
    const bytes = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
    const paths = await fixture("ranges", bytes);
    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 8,
    });

    await expect(
      collect(
        readFileContainerRange({
          path: paths.encryptedPath,
          key: paths.key,
          start: 6,
          endExclusive: 19,
        }),
      ),
    ).resolves.toEqual(bytes.subarray(6, 19));
    await expect(
      collect(
        readFileContainerRange({
          path: paths.encryptedPath,
          key: paths.key,
          start: 8,
          endExclusive: 9,
        }),
      ),
    ).resolves.toEqual(bytes.subarray(8, 9));
  });

  it("uses distinct random nonce material for each file", async () => {
    const bytes = Buffer.from("same plaintext");
    const paths = await fixture("nonces", bytes);
    const secondPath = join(paths.root, "second.pond");

    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 8,
    });
    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: secondPath,
      key: paths.key,
      chunkSize: 8,
    });

    expect(await readFile(paths.encryptedPath)).not.toEqual(
      await readFile(secondPath),
    );
  });

  it("rejects header tampering and the wrong key", async () => {
    const paths = await fixture("header-auth", Buffer.from("authenticated"));
    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 8,
    });

    await expect(
      readFileContainerMetadata({
        path: paths.encryptedPath,
        key: randomBytes(32),
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_FAILED" });

    await flipByte(paths.encryptedPath, 20);
    await expect(
      readFileContainerMetadata({
        path: paths.encryptedPath,
        key: paths.key,
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_FAILED" });
  });

  it("authenticates each requested chunk independently", async () => {
    const bytes = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
    const paths = await fixture("chunk-auth", bytes);
    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 8,
    });
    await flipByte(paths.encryptedPath, HEADER_BYTES + 2);

    await expect(
      collect(
        readFileContainerRange({
          path: paths.encryptedPath,
          key: paths.key,
          start: 16,
          endExclusive: 24,
        }),
      ),
    ).resolves.toEqual(bytes.subarray(16, 24));
    await expect(
      collect(
        readFileContainerRange({
          path: paths.encryptedPath,
          key: paths.key,
          start: 0,
          endExclusive: 1,
        }),
      ),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_FAILED" });
    await expect(
      decryptFileContainer({
        inputPath: paths.encryptedPath,
        outputPath: paths.outputPath,
        key: paths.key,
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_FAILED" });
    await expect(stat(paths.outputPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects truncated and overlong containers", async () => {
    const paths = await fixture("lengths", Buffer.from("0123456789"));
    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 4,
    });
    const encodedSize = (await stat(paths.encryptedPath)).size;

    await truncate(paths.encryptedPath, encodedSize - 1);
    await expect(
      readFileContainerMetadata({
        path: paths.encryptedPath,
        key: paths.key,
      }),
    ).rejects.toMatchObject({ code: "INVALID_FORMAT" });

    await rm(paths.encryptedPath);
    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 4,
    });
    await appendFile(paths.encryptedPath, Buffer.from([0]));
    await expect(
      readFileContainerMetadata({
        path: paths.encryptedPath,
        key: paths.key,
      }),
    ).rejects.toMatchObject({ code: "INVALID_FORMAT" });
  });

  it("rejects ranges outside the original file", async () => {
    const paths = await fixture("invalid-range", Buffer.from("0123456789"));
    await encryptFileContainer({
      inputPath: paths.inputPath,
      outputPath: paths.encryptedPath,
      key: paths.key,
      chunkSize: 4,
    });

    await expect(
      collect(
        readFileContainerRange({
          path: paths.encryptedPath,
          key: paths.key,
          start: 9,
          endExclusive: 11,
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_RANGE" });
  });
});
