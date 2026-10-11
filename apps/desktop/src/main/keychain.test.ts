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

describe("secrets", () => {
  it("stores secrets protected by the operating system", async () => {
    await keychain.setSecret("agent:test", "sk-test");

    expect(await keychain.getSecret("agent:test")).toBe("sk-test");
    expect(
      await readFile(join(userData, "secrets.json"), "utf8"),
    ).not.toContain(Buffer.from("sk-test").toString("base64"));
  });

  it("falls back to tagged plaintext when protection is unavailable", async () => {
    port.encryptionEnabled = false;
    await keychain.setSecret("agent:test", "sk-test");

    expect(await keychain.getSecret("agent:test")).toBe("sk-test");
  });

  it("returns null for a protected secret that cannot be decrypted", async () => {
    await keychain.setSecret("agent:test", "sk-test");
    port.decryptionEnabled = false;

    expect(await keychain.getSecret("agent:test")).toBeNull();
  });
});
