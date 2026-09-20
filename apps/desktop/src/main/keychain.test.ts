import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createKeychain, type KeychainPort } from "./keychain";

let userData = "";
let port: TestKeychainPort;
let keychain: ReturnType<typeof createKeychain>;

class TestKeychainPort implements KeychainPort {
  encryptionEnabled = true;
  decryptionEnabled = true;

  constructor(private readonly directory: string) {}

  userDataPath(): string {
    return this.directory;
  }

  encryptionAvailable(): boolean {
    return this.encryptionEnabled;
  }

  protect(value: string): Buffer {
    if (!this.encryptionEnabled) throw new Error("Encryption unavailable.");
    return Buffer.from(`protected:${value}`, "utf8");
  }

  unprotect(value: Buffer): string {
    if (!this.decryptionEnabled) throw new Error("Decryption unavailable.");
    const protectedValue = value.toString("utf8");
    if (!protectedValue.startsWith("protected:"))
      throw new Error("Invalid protected value.");
    return protectedValue.slice("protected:".length);
  }
}

beforeEach(async () => {
  userData = await mkdtemp(join(tmpdir(), "pond-keychain-"));
  port = new TestKeychainPort(userData);
  keychain = createKeychain(port);
});

afterEach(async () => {
  await rm(userData, { recursive: true, force: true });
});

describe("secure secrets", () => {
  it("creates and reuses an operating-system-protected key", async () => {
    const created = await keychain.ensureSecureSecretBytes("database:test", 32);
    const reopened = await keychain.ensureSecureSecretBytes(
      "database:test",
      32,
    );

    expect(reopened).toEqual(created);
    expect(await keychain.getSecureSecret("database:test")).toBe(
      created.toString("base64"),
    );
    expect(
      await readFile(join(userData, "secrets.json"), "utf8"),
    ).not.toContain(created.toString("base64"));

    created.fill(0);
    reopened.fill(0);
  });

  it("fails closed when secure key storage is unavailable", async () => {
    port.encryptionEnabled = false;

    await expect(
      keychain.ensureSecureSecretBytes("database:test", 32),
    ).rejects.toThrow("Secure key storage is unavailable");
  });

  it("does not replace a secure key that cannot be decrypted", async () => {
    const created = await keychain.ensureSecureSecretBytes("database:test", 32);
    const secretsBefore = await readFile(
      join(userData, "secrets.json"),
      "utf8",
    );
    port.decryptionEnabled = false;

    await expect(
      keychain.ensureSecureSecretBytes("database:test", 32),
    ).rejects.toThrow("Secure secret could not be decrypted");
    expect(await readFile(join(userData, "secrets.json"), "utf8")).toBe(
      secretsBefore,
    );

    created.fill(0);
  });
});
