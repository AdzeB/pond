import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app, safeStorage } from "electron";
import log from "electron-log/main.js";
import {
  KEYCHAIN_AI_API_KEY,
  KEYCHAIN_INGEST_TOKEN,
  KEYCHAIN_SERVICE,
} from "../shared/constants";

const SECRETS_FILE = "secrets.json";

type SecretMap = Record<string, string>;

function secretsPath(): string {
  return join(app.getPath("userData"), SECRETS_FILE);
}

function entryKey(service: string, account: string): string {
  return `${service}:${account}`;
}

async function readAll(): Promise<SecretMap> {
  try {
    const buf = await readFile(secretsPath(), "utf8");
    const parsed = JSON.parse(buf) as unknown;
    if (parsed && typeof parsed === "object") return parsed as SecretMap;
    return {};
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    log.warn("[pond] failed to read secrets file, starting empty", err);
    return {};
  }
}

async function writeAll(map: SecretMap): Promise<void> {
  await writeFile(secretsPath(), JSON.stringify(map), { mode: 0o600 });
}

function encrypt(plain: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return `enc:${safeStorage.encryptString(plain).toString("base64")}`;
  }
  // No keychain backend (Linux/first-run); tag the value so reads don't decrypt plaintext.
  log.warn(
    "[pond] safeStorage encryption unavailable, persisting secret in plaintext",
  );
  return `raw:${Buffer.from(plain, "utf8").toString("base64")}`;
}

function decrypt(value: string): string | null {
  try {
    if (value.startsWith("enc:")) {
      if (!safeStorage.isEncryptionAvailable()) return null;
      return safeStorage.decryptString(Buffer.from(value.slice(4), "base64"));
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

export async function getIngestToken(): Promise<string | null> {
  const all = await readAll();
  const value = all[entryKey(KEYCHAIN_SERVICE, KEYCHAIN_INGEST_TOKEN)];
  if (!value) return null;
  return decrypt(value);
}

async function setIngestToken(token: string): Promise<void> {
  const all = await readAll();
  all[entryKey(KEYCHAIN_SERVICE, KEYCHAIN_INGEST_TOKEN)] = encrypt(token);
  await writeAll(all);
}

export async function ensureIngestToken(): Promise<string> {
  const existing = await getIngestToken();
  if (existing) return existing;
  const token = randomBytes(24).toString("hex");
  await setIngestToken(token);
  return token;
}

export async function rotateIngestToken(): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await setIngestToken(token);
  return token;
}

// Per-provider API key for hosted/OpenAI-compatible AI endpoints. Stored
// encrypted, never in prefs. Keyed by provider id so several can be configured
// at once and switching providers never overwrites another's key. Returns null
// when none is set (local servers don't need one).
function aiApiKeyAccount(provider: string): string {
  return `${KEYCHAIN_AI_API_KEY}:${provider}`;
}

export async function getAiApiKey(provider: string): Promise<string | null> {
  const all = await readAll();
  const value = all[entryKey(KEYCHAIN_SERVICE, aiApiKeyAccount(provider))];
  if (value) return decrypt(value);
  // Back-compat: fall back to the legacy single-slot key for the active provider
  // so keys saved before per-provider storage aren't lost.
  const legacy = all[entryKey(KEYCHAIN_SERVICE, KEYCHAIN_AI_API_KEY)];
  if (legacy) return decrypt(legacy);
  return null;
}

export async function setAiApiKey(
  provider: string,
  key: string | null,
): Promise<void> {
  const all = await readAll();
  const mapKey = entryKey(KEYCHAIN_SERVICE, aiApiKeyAccount(provider));
  if (key && key.trim().length > 0) all[mapKey] = encrypt(key.trim());
  else delete all[mapKey];
  await writeAll(all);
}
