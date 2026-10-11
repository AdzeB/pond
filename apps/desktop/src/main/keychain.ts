import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app, safeStorage } from "electron";
import log from "electron-log/main.js";
import { z } from "zod";
import { KEYCHAIN_INGEST_TOKEN, KEYCHAIN_SERVICE } from "../shared/constants";

const SECRETS_FILE = "secrets.json";

const SecretMapSchema = z.record(z.string(), z.string());

type SecretMap = z.infer<typeof SecretMapSchema>;

export interface KeychainPort {
  userDataPath: () => string;
  encryptionAvailable: () => boolean;
  protect: (value: string) => Buffer;
  unprotect: (value: Buffer) => string;
}

const electronKeychainPort: KeychainPort = {
  userDataPath: () => app.getPath("userData"),
  encryptionAvailable: () => safeStorage.isEncryptionAvailable(),
  protect: (value) => safeStorage.encryptString(value),
  unprotect: (value) => safeStorage.decryptString(value),
};

function secretsPath(port: KeychainPort): string {
  return join(port.userDataPath(), SECRETS_FILE);
}

function entryKey(service: string, account: string): string {
  return `${service}:${account}`;
}

async function readAll(port: KeychainPort): Promise<SecretMap> {
  try {
    const buf = await readFile(secretsPath(port), "utf8");
    const parsed = SecretMapSchema.safeParse(JSON.parse(buf));
    return parsed.success ? parsed.data : {};
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      return {};
    }
    log.warn("[pond] failed to read secrets file, starting empty", cause);
    return {};
  }
}

async function writeAll(port: KeychainPort, map: SecretMap): Promise<void> {
  await writeFile(secretsPath(port), JSON.stringify(map), { mode: 0o600 });
}

function encrypt(port: KeychainPort, plain: string): string {
  if (port.encryptionAvailable()) {
    return `enc:${port.protect(plain).toString("base64")}`;
  }
  /** No keychain backend (Linux/first-run); tag the value so reads don't decrypt plaintext. */
  log.warn(
    "[pond] safeStorage encryption unavailable, persisting secret in plaintext",
  );
  return `raw:${Buffer.from(plain, "utf8").toString("base64")}`;
}

function decrypt(port: KeychainPort, value: string): string | null {
  try {
    if (value.startsWith("enc:")) {
      if (!port.encryptionAvailable()) return null;
      return port.unprotect(Buffer.from(value.slice(4), "base64"));
    }
    if (value.startsWith("raw:")) {
      return Buffer.from(value.slice(4), "base64").toString("utf8");
    }
    return null;
  } catch (err) {
    log.warn("[pond] failed to decrypt secret", err);
    return null;
  }
}

export function createKeychain(port: KeychainPort) {
  async function getSecret(account: string): Promise<string | null> {
    const all = await getSecrets([account]);
    return all[account] ?? null;
  }

  async function getSecrets(
    accounts: string[],
  ): Promise<Record<string, string | null>> {
    const all = await readAll(port);
    const out: Record<string, string | null> = {};
    for (const account of accounts) {
      const value = all[entryKey(KEYCHAIN_SERVICE, account)];
      out[account] = value ? decrypt(port, value) : null;
    }
    return out;
  }

  async function setSecret(account: string, plain: string): Promise<void> {
    const all = await readAll(port);
    all[entryKey(KEYCHAIN_SERVICE, account)] = encrypt(port, plain);
    await writeAll(port, all);
  }

  async function deleteSecret(account: string): Promise<void> {
    const all = await readAll(port);
    delete all[entryKey(KEYCHAIN_SERVICE, account)];
    await writeAll(port, all);
  }

  async function getIngestToken(): Promise<string | null> {
    return getSecret(KEYCHAIN_INGEST_TOKEN);
  }

  async function setIngestToken(token: string): Promise<void> {
    await setSecret(KEYCHAIN_INGEST_TOKEN, token);
  }

  async function ensureIngestToken(): Promise<string> {
    const existing = await getIngestToken();
    if (existing) return existing;
    const token = randomBytes(24).toString("hex");
    await setIngestToken(token);
    return token;
  }

  async function rotateIngestToken(): Promise<string> {
    const token = randomBytes(24).toString("hex");
    await setIngestToken(token);
    return token;
  }

  return {
    deleteSecret,
    ensureIngestToken,
    getIngestToken,
    getSecret,
    getSecrets,
    rotateIngestToken,
    setSecret,
  };
}

export const {
  deleteSecret,
  ensureIngestToken,
  getIngestToken,
  getSecret,
  getSecrets,
  rotateIngestToken,
  setSecret,
} = createKeychain(electronKeychainPort);
