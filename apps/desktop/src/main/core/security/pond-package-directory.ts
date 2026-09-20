import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import {
  decryptFileContainer,
  encryptFileContainer,
  readFileContainerMetadata,
} from "./chunked-file-container";
import {
  createLibrarySecurity,
  type ScryptWorkFactors,
  unlockLibraryWithPassword,
  unlockLibraryWithRecoveryKey,
  zeroizeSecret,
} from "./library-security";
import {
  type LibrarySecurityManifest,
  LibrarySecurityManifestSchema,
} from "./library-security-manifest";

export const POND_PACKAGE_SECURITY_MANIFEST_FILENAME =
  "pond-package-security.json";

const PACKAGE_FORMAT = "pond-package-security";
const PACKAGE_VERSION = 1;
const INVENTORY_ALGORITHM = "hmac-sha256";
const INVENTORY_TAG_BYTES = 32;
const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
const MAX_PACKAGE_FILES = 100_000;
const MAX_RELATIVE_PATH_BYTES = 4_096;

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function comparePortablePaths(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

const PortableRelativePathSchema = z
  .string()
  .min(1)
  .max(MAX_RELATIVE_PATH_BYTES)
  .refine(
    (value) =>
      !isAbsolute(value) &&
      !value.includes("\\") &&
      !/^[A-Za-z]:/.test(value) &&
      !hasControlCharacters(value) &&
      value.split("/").every((segment) => {
        return segment.length > 0 && segment !== "." && segment !== "..";
      }),
    { message: "Expected a safe portable relative path." },
  );

const canonicalBase64 = (bytes: number) =>
  z.string().refine(
    (value) => {
      const decoded = Buffer.from(value, "base64");
      return (
        decoded.byteLength === bytes && decoded.toString("base64") === value
      );
    },
    { message: `Expected canonical base64 for ${bytes} bytes.` },
  );

const PackageFileSchema = z.strictObject({
  path: PortableRelativePathSchema,
  plaintextSize: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

export const PondPackageSecurityManifestSchema = z
  .strictObject({
    format: z.literal(PACKAGE_FORMAT),
    version: z.literal(PACKAGE_VERSION),
    security: LibrarySecurityManifestSchema,
    inventory: z.strictObject({
      algorithm: z.literal(INVENTORY_ALGORITHM),
      files: z.array(PackageFileSchema).max(MAX_PACKAGE_FILES),
      tag: canonicalBase64(INVENTORY_TAG_BYTES),
    }),
  })
  .superRefine((manifest, context) => {
    const names = new Set<string>();
    let previous = "";
    for (const [index, file] of manifest.inventory.files.entries()) {
      const portableName = file.path.toLocaleLowerCase("en-US");
      if (names.has(portableName)) {
        context.addIssue({
          code: "custom",
          message: "Package paths must be unique.",
          path: ["inventory", "files", index, "path"],
        });
      }
      if (index > 0 && comparePortablePaths(previous, file.path) >= 0) {
        context.addIssue({
          code: "custom",
          message: "Package paths must use canonical order.",
          path: ["inventory", "files", index, "path"],
        });
      }
      names.add(portableName);
      previous = file.path;
    }
  });

export type PondPackageSecurityManifest = z.infer<
  typeof PondPackageSecurityManifestSchema
>;

export type PondPackageDirectoryErrorCode =
  | "DIRECTORIES_OVERLAP"
  | "DIRECTORY_NOT_EMPTY"
  | "INCOMPLETE_PACKAGE"
  | "INVALID_DIRECTORY"
  | "INVALID_MANIFEST"
  | "INVENTORY_AUTHENTICATION_FAILED"
  | "UNSUPPORTED_ENTRY";

export class PondPackageDirectoryError extends Error {
  readonly code: PondPackageDirectoryErrorCode;

  constructor(code: PondPackageDirectoryErrorCode, message: string) {
    super(message);
    this.name = "PondPackageDirectoryError";
    this.code = code;
  }
}

export interface ProtectPondPackageDirectoryInput {
  sourceDirectory: string;
  packageDirectory: string;
  password: string;
  chunkSize?: number;
  passwordKdf?: ScryptWorkFactors;
  recoveryKdf?: ScryptWorkFactors;
}

export interface ProtectedPondPackageDirectory {
  manifest: PondPackageSecurityManifest;
  recoveryKey: string;
  fileCount: number;
}

export interface DecryptPondPackageDirectoryInput {
  packageDirectory: string;
  stagingDirectory: string;
}

export interface DecryptPondPackageDirectoryWithPasswordInput
  extends DecryptPondPackageDirectoryInput {
  password: string;
}

export interface DecryptPondPackageDirectoryWithRecoveryKeyInput
  extends DecryptPondPackageDirectoryInput {
  recoveryKey: string;
}

interface ScannedFile {
  path: string;
  absolutePath: string;
  size: number;
}

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
}

function targetFor(root: string, portablePath: string): string {
  const target = resolve(root, ...portablePath.split("/"));
  if (target === root || !isWithin(root, target)) {
    throw new PondPackageDirectoryError(
      "INVALID_MANIFEST",
      "The package inventory contains an unsafe path.",
    );
  }
  return target;
}

async function directoryRoot(
  path: string,
  requireEmpty: boolean,
): Promise<string> {
  const metadata = await lstat(path).catch(() => null);
  if (!metadata || metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new PondPackageDirectoryError(
      "INVALID_DIRECTORY",
      "The package operation requires a real directory.",
    );
  }
  if (requireEmpty && (await readdir(path)).length > 0) {
    throw new PondPackageDirectoryError(
      "DIRECTORY_NOT_EMPTY",
      "The destination directory must be empty.",
    );
  }
  return realpath(path);
}

function assertSeparateDirectories(first: string, second: string): void {
  if (isWithin(first, second) || isWithin(second, first)) {
    throw new PondPackageDirectoryError(
      "DIRECTORIES_OVERLAP",
      "Source and destination directories must not overlap.",
    );
  }
}

async function scanDirectory(root: string): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  const names = new Set<string>();

  async function visit(directory: string, segments: string[]): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => comparePortablePaths(left.name, right.name));
    for (const entry of entries) {
      const pathSegments = [...segments, entry.name];
      const portablePath = pathSegments.join("/");
      const parsedPath = PortableRelativePathSchema.safeParse(portablePath);
      if (!parsedPath.success) {
        throw new PondPackageDirectoryError(
          "UNSUPPORTED_ENTRY",
          "The directory contains a path that is not portable.",
        );
      }
      const absolutePath = targetFor(root, portablePath);
      const metadata = await lstat(absolutePath);
      if (metadata.isSymbolicLink()) {
        throw new PondPackageDirectoryError(
          "UNSUPPORTED_ENTRY",
          "Package directories must not contain symbolic links.",
        );
      }
      if (metadata.isDirectory()) {
        await visit(absolutePath, pathSegments);
        continue;
      }
      if (!metadata.isFile() || !Number.isSafeInteger(metadata.size)) {
        throw new PondPackageDirectoryError(
          "UNSUPPORTED_ENTRY",
          "Package directories may contain only regular files and directories.",
        );
      }
      const actualPath = await realpath(absolutePath);
      if (!isWithin(root, actualPath)) {
        throw new PondPackageDirectoryError(
          "UNSUPPORTED_ENTRY",
          "A package file resolves outside its directory.",
        );
      }
      const portableName = portablePath.toLocaleLowerCase("en-US");
      if (names.has(portableName)) {
        throw new PondPackageDirectoryError(
          "UNSUPPORTED_ENTRY",
          "Package paths must be unique across portable filesystems.",
        );
      }
      names.add(portableName);
      files.push({ path: portablePath, absolutePath, size: metadata.size });
      if (files.length > MAX_PACKAGE_FILES) {
        throw new PondPackageDirectoryError(
          "UNSUPPORTED_ENTRY",
          "The package contains too many files.",
        );
      }
    }
  }

  await visit(root, []);
  files.sort((left, right) => comparePortablePaths(left.path, right.path));
  return files;
}

function deriveKey(masterKey: Uint8Array, purpose: string): Buffer {
  return createHmac("sha256", masterKey)
    .update("pond-package-directory-v1\0", "utf8")
    .update(purpose, "utf8")
    .digest();
}

function inventoryPayload(
  security: LibrarySecurityManifest,
  files: readonly z.infer<typeof PackageFileSchema>[],
): Buffer {
  return Buffer.from(
    JSON.stringify({
      format: PACKAGE_FORMAT,
      version: PACKAGE_VERSION,
      security,
      files,
    }),
    "utf8",
  );
}

function inventoryTag(
  masterKey: Uint8Array,
  security: LibrarySecurityManifest,
  files: readonly z.infer<typeof PackageFileSchema>[],
): string {
  const key = deriveKey(masterKey, "inventory");
  const payload = inventoryPayload(security, files);
  try {
    return createHmac("sha256", key).update(payload).digest("base64");
  } finally {
    key.fill(0);
    payload.fill(0);
  }
}

function authenticateInventory(
  manifest: PondPackageSecurityManifest,
  masterKey: Uint8Array,
): void {
  const actual = Buffer.from(manifest.inventory.tag, "base64");
  const expected = Buffer.from(
    inventoryTag(masterKey, manifest.security, manifest.inventory.files),
    "base64",
  );
  try {
    if (!timingSafeEqual(actual, expected)) {
      throw new PondPackageDirectoryError(
        "INVENTORY_AUTHENTICATION_FAILED",
        "The package inventory could not be authenticated.",
      );
    }
  } finally {
    actual.fill(0);
    expected.fill(0);
  }
}

function fileKey(masterKey: Uint8Array, path: string): Buffer {
  return deriveKey(masterKey, `file\0${path}`);
}

async function clearDirectory(root: string): Promise<void> {
  const entries = await readdir(root).catch((): string[] => []);
  await Promise.all(
    entries.map((entry) =>
      rm(join(root, entry), { recursive: true, force: true }),
    ),
  );
}

async function prepareParent(path: string): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
}

export async function readPondPackageSecurityManifest(
  packageDirectory: string,
): Promise<PondPackageSecurityManifest> {
  const root = await directoryRoot(packageDirectory, false);
  const path = join(root, POND_PACKAGE_SECURITY_MANIFEST_FILENAME);
  const metadata = await lstat(path).catch(() => null);
  if (
    !metadata ||
    metadata.isSymbolicLink() ||
    !metadata.isFile() ||
    metadata.size > MAX_MANIFEST_BYTES
  ) {
    throw new PondPackageDirectoryError(
      "INVALID_MANIFEST",
      "The package security manifest is missing or invalid.",
    );
  }
  try {
    return PondPackageSecurityManifestSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
  } catch (error) {
    if (error instanceof PondPackageDirectoryError) throw error;
    throw new PondPackageDirectoryError(
      "INVALID_MANIFEST",
      "The package security manifest is malformed.",
    );
  }
}

export async function protectPondPackageDirectory(
  input: ProtectPondPackageDirectoryInput,
): Promise<ProtectedPondPackageDirectory> {
  const sourceRoot = await directoryRoot(input.sourceDirectory, false);
  const packageRoot = await directoryRoot(input.packageDirectory, true);
  assertSeparateDirectories(sourceRoot, packageRoot);
  const files = await scanDirectory(sourceRoot);
  if (
    files.some(
      (file) =>
        file.path.toLocaleLowerCase("en-US") ===
        POND_PACKAGE_SECURITY_MANIFEST_FILENAME,
    )
  ) {
    throw new PondPackageDirectoryError(
      "UNSUPPORTED_ENTRY",
      "The source directory contains the reserved package security manifest.",
    );
  }

  const created = await createLibrarySecurity({
    libraryId: `pond-package:${randomUUID()}`,
    password: input.password,
    passwordKdf: input.passwordKdf,
    recoveryKdf: input.recoveryKdf,
  });
  try {
    const inventoryFiles = files.map((file) => ({
      path: file.path,
      plaintextSize: file.size,
    }));
    for (const file of files) {
      const outputPath = targetFor(packageRoot, file.path);
      await prepareParent(outputPath);
      const key = fileKey(created.masterKey, file.path);
      try {
        const metadata = await encryptFileContainer({
          inputPath: file.absolutePath,
          outputPath,
          key,
          chunkSize: input.chunkSize,
        });
        if (metadata.originalSize !== file.size) {
          throw new PondPackageDirectoryError(
            "UNSUPPORTED_ENTRY",
            "A source file changed while the package was protected.",
          );
        }
      } finally {
        key.fill(0);
      }
    }
    const manifest = PondPackageSecurityManifestSchema.parse({
      format: PACKAGE_FORMAT,
      version: PACKAGE_VERSION,
      security: created.manifest,
      inventory: {
        algorithm: INVENTORY_ALGORITHM,
        files: inventoryFiles,
        tag: inventoryTag(created.masterKey, created.manifest, inventoryFiles),
      },
    });
    await writeFile(
      join(packageRoot, POND_PACKAGE_SECURITY_MANIFEST_FILENAME),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: "wx" },
    );
    return {
      manifest,
      recoveryKey: created.recoveryKey,
      fileCount: files.length,
    };
  } catch (error) {
    await clearDirectory(packageRoot);
    throw error;
  } finally {
    zeroizeSecret(created.masterKey);
  }
}

async function verifyPackageFiles(
  root: string,
  manifest: PondPackageSecurityManifest,
  masterKey: Uint8Array,
): Promise<void> {
  const actual = (await scanDirectory(root)).filter(
    (file) => file.path !== POND_PACKAGE_SECURITY_MANIFEST_FILENAME,
  );
  const expected = manifest.inventory.files;
  if (
    actual.length !== expected.length ||
    actual.some((file, index) => file.path !== expected[index]?.path)
  ) {
    throw new PondPackageDirectoryError(
      "INCOMPLETE_PACKAGE",
      "The package file inventory does not match its manifest.",
    );
  }
  for (const file of expected) {
    const key = fileKey(masterKey, file.path);
    try {
      const metadata = await readFileContainerMetadata({
        path: targetFor(root, file.path),
        key,
      });
      if (metadata.originalSize !== file.plaintextSize) {
        throw new PondPackageDirectoryError(
          "INCOMPLETE_PACKAGE",
          "A package file does not match its inventory.",
        );
      }
    } finally {
      key.fill(0);
    }
  }
}

async function decryptPondPackageDirectory(
  input: DecryptPondPackageDirectoryInput,
  unlock: (manifest: LibrarySecurityManifest) => Promise<Buffer>,
): Promise<{ fileCount: number }> {
  const packageRoot = await directoryRoot(input.packageDirectory, false);
  const stagingRoot = await directoryRoot(input.stagingDirectory, true);
  assertSeparateDirectories(packageRoot, stagingRoot);
  const manifest = await readPondPackageSecurityManifest(packageRoot);
  const masterKey = await unlock(manifest.security);
  try {
    authenticateInventory(manifest, masterKey);
    await verifyPackageFiles(packageRoot, manifest, masterKey);
    try {
      for (const file of manifest.inventory.files) {
        const outputPath = targetFor(stagingRoot, file.path);
        await prepareParent(outputPath);
        const key = fileKey(masterKey, file.path);
        try {
          await decryptFileContainer({
            inputPath: targetFor(packageRoot, file.path),
            outputPath,
            key,
          });
        } finally {
          key.fill(0);
        }
      }
    } catch (error) {
      await clearDirectory(stagingRoot);
      throw error;
    }
    return { fileCount: manifest.inventory.files.length };
  } finally {
    zeroizeSecret(masterKey);
  }
}

export function decryptPondPackageDirectoryWithPassword(
  input: DecryptPondPackageDirectoryWithPasswordInput,
): Promise<{ fileCount: number }> {
  return decryptPondPackageDirectory(input, (manifest) =>
    unlockLibraryWithPassword(manifest, input.password),
  );
}

export function decryptPondPackageDirectoryWithRecoveryKey(
  input: DecryptPondPackageDirectoryWithRecoveryKeyInput,
): Promise<{ fileCount: number }> {
  return decryptPondPackageDirectory(input, (manifest) =>
    unlockLibraryWithRecoveryKey(manifest, input.recoveryKey),
  );
}
