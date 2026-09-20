import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LibrarySecurityUnlockError } from "./library-security";
import {
  decryptPondPackageDirectoryWithPassword,
  decryptPondPackageDirectoryWithRecoveryKey,
  POND_PACKAGE_SECURITY_MANIFEST_FILENAME,
  PondPackageDirectoryError,
  PondPackageSecurityManifestSchema,
  protectPondPackageDirectory,
  readPondPackageSecurityManifest,
} from "./pond-package-directory";

const TEST_KDF = { N: 16_384, r: 8, p: 1 };
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function emptyDirectory(root: string, name: string): Promise<string> {
  const path = join(root, name);
  await mkdir(path);
  return path;
}

async function fixture(name: string) {
  const root = await mkdtemp(join(tmpdir(), `pond-protected-package-${name}-`));
  roots.push(root);
  const sourceDirectory = await emptyDirectory(root, "source");
  const packageDirectory = await emptyDirectory(root, "package");
  const stagingDirectory = await emptyDirectory(root, "staging");
  await mkdir(join(sourceDirectory, "media"));
  await writeFile(
    join(sourceDirectory, "pond-export.json"),
    JSON.stringify({ version: 1, title: "Private package" }),
  );
  await writeFile(
    join(sourceDirectory, "media", "large.bin"),
    Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz"),
  );
  await writeFile(join(sourceDirectory, "empty.txt"), Buffer.alloc(0));
  return { root, sourceDirectory, packageDirectory, stagingDirectory };
}

async function protectFixture(name: string) {
  const paths = await fixture(name);
  const protectedPackage = await protectPondPackageDirectory({
    sourceDirectory: paths.sourceDirectory,
    packageDirectory: paths.packageDirectory,
    password: "correct horse battery staple",
    passwordKdf: TEST_KDF,
    recoveryKdf: TEST_KDF,
    chunkSize: 8,
  });
  return { ...paths, protectedPackage };
}

async function expectEmpty(path: string): Promise<void> {
  await expect(readdir(path)).resolves.toEqual([]);
}

async function flipByte(path: string, position: number): Promise<void> {
  const handle = await open(path, "r+");
  try {
    const byte = Buffer.alloc(1);
    await handle.read(byte, 0, 1, position);
    byte[0] = (byte[0] ?? 0) ^ 0x80;
    await handle.write(byte, 0, 1, position);
  } finally {
    await handle.close();
  }
}

describe("protected Pond package directories", () => {
  it("protects every file and unlocks with either credential", async () => {
    const paths = await protectFixture("round-trip");
    const manifestPath = join(
      paths.packageDirectory,
      POND_PACKAGE_SECURITY_MANIFEST_FILENAME,
    );
    const serializedManifest = await readFile(manifestPath, "utf8");
    const encryptedManifest = await readFile(
      join(paths.packageDirectory, "pond-export.json"),
    );
    const encryptedMedia = await readFile(
      join(paths.packageDirectory, "media", "large.bin"),
    );

    expect(paths.protectedPackage.fileCount).toBe(3);
    expect(encryptedManifest.subarray(0, 8).toString("ascii")).toBe("PONDFILE");
    expect(encryptedMedia.subarray(0, 8).toString("ascii")).toBe("PONDFILE");
    expect(serializedManifest).not.toContain("correct horse battery staple");
    expect(serializedManifest).not.toContain(
      paths.protectedPackage.recoveryKey,
    );
    expect(serializedManifest).not.toContain("Private package");
    expect(() =>
      PondPackageSecurityManifestSchema.parse({
        ...paths.protectedPackage.manifest,
        unexpected: true,
      }),
    ).toThrow();
    expect(() =>
      PondPackageSecurityManifestSchema.parse({
        ...paths.protectedPackage.manifest,
        version: 2,
      }),
    ).toThrow();
    await expect(
      readPondPackageSecurityManifest(paths.packageDirectory),
    ).resolves.toEqual(paths.protectedPackage.manifest);

    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).resolves.toEqual({ fileCount: 3 });
    expect(
      await readFile(join(paths.stagingDirectory, "pond-export.json"), "utf8"),
    ).toContain("Private package");
    expect(
      await readFile(join(paths.stagingDirectory, "media", "large.bin")),
    ).toEqual(
      await readFile(join(paths.sourceDirectory, "media", "large.bin")),
    );

    const recoveryStaging = await emptyDirectory(paths.root, "recovery");
    await expect(
      decryptPondPackageDirectoryWithRecoveryKey({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: recoveryStaging,
        recoveryKey: paths.protectedPackage.recoveryKey,
      }),
    ).resolves.toEqual({ fileCount: 3 });
    expect(await readFile(join(recoveryStaging, "empty.txt"))).toHaveLength(0);
  });

  it("rejects a wrong password without leaving plaintext output", async () => {
    const paths = await protectFixture("wrong-password");

    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "wrong password",
      }),
    ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);
    await expectEmpty(paths.stagingDirectory);
  });

  it("rejects encrypted-file tampering and removes partial output", async () => {
    const paths = await protectFixture("tamper");
    await flipByte(join(paths.packageDirectory, "media", "large.bin"), 60);

    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_FAILED" });
    await expectEmpty(paths.stagingDirectory);
  });

  it("detects deleted, added, and renamed package files", async () => {
    const paths = await protectFixture("inventory");
    const encryptedPath = join(paths.packageDirectory, "media", "large.bin");
    const heldPath = join(paths.root, "held.bin");
    const renamedPath = join(paths.packageDirectory, "media", "renamed.bin");

    await rename(encryptedPath, heldPath);
    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).rejects.toMatchObject({ code: "INCOMPLETE_PACKAGE" });
    await rename(heldPath, encryptedPath);

    const addedPath = join(paths.packageDirectory, "added.bin");
    await writeFile(addedPath, Buffer.from("addition"));
    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).rejects.toMatchObject({ code: "INCOMPLETE_PACKAGE" });
    await rm(addedPath);

    await rename(encryptedPath, renamedPath);
    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).rejects.toMatchObject({ code: "INCOMPLETE_PACKAGE" });
    await rename(renamedPath, heldPath);
    await symlink(heldPath, encryptedPath);
    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_ENTRY" });
    await expectEmpty(paths.stagingDirectory);
  });

  it("authenticates inventory metadata before decrypting files", async () => {
    const paths = await protectFixture("inventory-auth");
    const manifestPath = join(
      paths.packageDirectory,
      POND_PACKAGE_SECURITY_MANIFEST_FILENAME,
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.inventory.files[0].plaintextSize += 1;
    await writeFile(manifestPath, JSON.stringify(manifest));

    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).rejects.toMatchObject({
      code: "INVENTORY_AUTHENTICATION_FAILED",
    });
    await expectEmpty(paths.stagingDirectory);
  });

  it("rejects traversal paths and symbolic links", async () => {
    const traversal = await protectFixture("traversal");
    const manifestPath = join(
      traversal.packageDirectory,
      POND_PACKAGE_SECURITY_MANIFEST_FILENAME,
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.inventory.files[0].path = "../outside.txt";
    await writeFile(manifestPath, JSON.stringify(manifest));

    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: traversal.packageDirectory,
        stagingDirectory: traversal.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).rejects.toMatchObject({ code: "INVALID_MANIFEST" });
    await expect(
      lstat(join(traversal.root, "outside.txt")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expectEmpty(traversal.stagingDirectory);

    const linked = await fixture("source-link");
    const outside = join(linked.root, "outside.bin");
    await writeFile(outside, Buffer.from("outside"));
    await symlink(outside, join(linked.sourceDirectory, "linked.bin"));
    await expect(
      protectPondPackageDirectory({
        sourceDirectory: linked.sourceDirectory,
        packageDirectory: linked.packageDirectory,
        password: "password",
        passwordKdf: TEST_KDF,
        recoveryKdf: TEST_KDF,
      }),
    ).rejects.toBeInstanceOf(PondPackageDirectoryError);
    await expectEmpty(linked.packageDirectory);
  });

  it("requires an empty staging directory and a complete manifest", async () => {
    const paths = await protectFixture("staging");
    await writeFile(join(paths.stagingDirectory, "existing.txt"), "existing");

    await expect(
      decryptPondPackageDirectoryWithPassword({
        packageDirectory: paths.packageDirectory,
        stagingDirectory: paths.stagingDirectory,
        password: "correct horse battery staple",
      }),
    ).rejects.toMatchObject({ code: "DIRECTORY_NOT_EMPTY" });
    expect(
      await readFile(join(paths.stagingDirectory, "existing.txt"), "utf8"),
    ).toBe("existing");

    const incomplete = await emptyDirectory(paths.root, "incomplete");
    await expect(
      readPondPackageSecurityManifest(incomplete),
    ).rejects.toMatchObject({ code: "INVALID_MANIFEST" });
  });
});
