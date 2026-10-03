import {
  createDecipheriv,
  createHash,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import {
  LIBRARY_KEY_WRAP_TAG_BYTES,
  LIBRARY_MASTER_KEY_BYTES,
  type LibrarySecurityManifest,
  LibrarySecurityManifestSchema,
  type ScryptKdf,
} from "./library-security-manifest";

const RECOVERY_KEY_ENTROPY_BYTES = 32;
const RECOVERY_KEY_CHECKSUM_BYTES = 4;
const RECOVERY_KEY_PREFIX = "POND-RK1";
const RECOVERY_KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export class LibrarySecurityUnlockError extends Error {
  readonly code = "LIBRARY_SECURITY_UNLOCK_FAILED";

  constructor() {
    super("The Library key could not be unlocked.");
    this.name = "LibrarySecurityUnlockError";
  }
}

function passwordBytes(password: string): Buffer {
  const value = Buffer.from(password, "utf8");
  if (value.byteLength === 0) {
    value.fill(0);
    throw new Error("Password must not be empty.");
  }
  if (value.byteLength > 1_024) {
    value.fill(0);
    throw new Error("Password must not exceed 1,024 bytes.");
  }
  return value;
}

function scryptMaxmem(kdf: ScryptKdf): number {
  return 128 * kdf.N * kdf.r + 8 * 1024 * 1024;
}

function deriveWrappingKey(
  secret: Uint8Array,
  kdf: ScryptKdf,
): Promise<Buffer> {
  const salt = Buffer.from(kdf.salt, "base64");
  return new Promise((resolve, reject) => {
    try {
      scrypt(
        secret,
        salt,
        kdf.keyBytes,
        {
          N: kdf.N,
          r: kdf.r,
          p: kdf.p,
          maxmem: scryptMaxmem(kdf),
        },
        (error, derivedKey) => {
          salt.fill(0);
          if (error) reject(error);
          else resolve(derivedKey);
        },
      );
    } catch (error) {
      salt.fill(0);
      reject(error);
    }
  });
}

function associatedData(
  manifest: Pick<
    LibrarySecurityManifest,
    "format" | "version" | "libraryId" | "keyVersion"
  >,
  slot: "password" | "recoveryKey",
  kdf: ScryptKdf,
): Buffer {
  return Buffer.from(
    JSON.stringify({
      format: manifest.format,
      version: manifest.version,
      libraryId: manifest.libraryId,
      keyVersion: manifest.keyVersion,
      slot,
      kdf,
      cipher: "aes-256-gcm",
    }),
    "utf8",
  );
}

async function unwrapMasterKey(
  manifest: LibrarySecurityManifest,
  slot: "password" | "recoveryKey",
  secret: Uint8Array,
): Promise<Buffer> {
  const wrapped = manifest.wrapping[slot];
  const wrappingKey = await deriveWrappingKey(secret, wrapped.kdf);
  const nonce = Buffer.from(wrapped.cipher.nonce, "base64");
  const ciphertext = Buffer.from(wrapped.cipher.ciphertext, "base64");
  const tag = Buffer.from(wrapped.cipher.tag, "base64");
  const aad = associatedData(manifest, slot, wrapped.kdf);
  try {
    const decipher = createDecipheriv("aes-256-gcm", wrappingKey, nonce, {
      authTagLength: LIBRARY_KEY_WRAP_TAG_BYTES,
    });
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const masterKey = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    if (masterKey.byteLength !== LIBRARY_MASTER_KEY_BYTES) {
      masterKey.fill(0);
      throw new LibrarySecurityUnlockError();
    }
    return masterKey;
  } catch (error) {
    if (error instanceof LibrarySecurityUnlockError) throw error;
    throw new LibrarySecurityUnlockError();
  } finally {
    wrappingKey.fill(0);
    nonce.fill(0);
    ciphertext.fill(0);
    tag.fill(0);
    aad.fill(0);
  }
}

function decodeBase32(encoded: string): Buffer {
  let value = 0;
  let bits = 0;
  const decoded: number[] = [];
  for (const character of encoded) {
    const normalized =
      character === "O"
        ? "0"
        : character === "I" || character === "L"
          ? "1"
          : character;
    const digit = RECOVERY_KEY_ALPHABET.indexOf(normalized);
    if (digit < 0)
      throw new Error("Recovery Key contains an invalid character.");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      decoded.push((value >>> bits) & 255);
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0 && value !== 0) {
    throw new Error("Recovery Key has invalid trailing data.");
  }
  return Buffer.from(decoded);
}

function recoveryKeyBytes(recoveryKey: string): Buffer {
  const compact = recoveryKey.toUpperCase().replace(/[\s-]/g, "");
  const prefix = RECOVERY_KEY_PREFIX.replace("-", "");
  if (!compact.startsWith(prefix)) {
    throw new Error("Recovery Key has an invalid prefix.");
  }
  const decoded = decodeBase32(compact.slice(prefix.length));
  try {
    if (
      decoded.byteLength !==
      RECOVERY_KEY_ENTROPY_BYTES + RECOVERY_KEY_CHECKSUM_BYTES
    ) {
      throw new Error("Recovery Key has an invalid length.");
    }
    const entropy = decoded.subarray(0, RECOVERY_KEY_ENTROPY_BYTES);
    const checksum = decoded.subarray(RECOVERY_KEY_ENTROPY_BYTES);
    const expected = createHash("sha256")
      .update(entropy)
      .digest()
      .subarray(0, RECOVERY_KEY_CHECKSUM_BYTES);
    try {
      if (!timingSafeEqual(checksum, expected)) {
        throw new Error("Recovery Key checksum does not match.");
      }
      return Buffer.from(entropy);
    } finally {
      expected.fill(0);
    }
  } finally {
    decoded.fill(0);
  }
}

export function zeroizeSecret(secret: Uint8Array): void {
  secret.fill(0);
}

export async function unlockLibraryWithPassword(
  manifestInput: LibrarySecurityManifest,
  passwordInput: string,
): Promise<Buffer> {
  const manifest = LibrarySecurityManifestSchema.parse(manifestInput);
  const password = passwordBytes(passwordInput);
  try {
    return await unwrapMasterKey(manifest, "password", password);
  } finally {
    password.fill(0);
  }
}

export async function unlockLibraryWithRecoveryKey(
  manifestInput: LibrarySecurityManifest,
  recoveryKey: string,
): Promise<Buffer> {
  const manifest = LibrarySecurityManifestSchema.parse(manifestInput);
  let secret: Buffer;
  try {
    secret = recoveryKeyBytes(recoveryKey);
  } catch {
    throw new LibrarySecurityUnlockError();
  }
  try {
    return await unwrapMasterKey(manifest, "recoveryKey", secret);
  } finally {
    secret.fill(0);
  }
}
