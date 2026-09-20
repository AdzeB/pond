import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import {
  LIBRARY_KDF_SALT_BYTES,
  LIBRARY_KEY_WRAP_NONCE_BYTES,
  LIBRARY_KEY_WRAP_TAG_BYTES,
  LIBRARY_MASTER_KEY_BYTES,
  LibrarySecurityLibraryIdSchema,
  type LibrarySecurityManifest,
  LibrarySecurityManifestSchema,
  type ScryptKdf,
  ScryptKdfSchema,
  type WrappedKey,
} from "./library-security-manifest";

const RECOVERY_KEY_ENTROPY_BYTES = 32;
const RECOVERY_KEY_CHECKSUM_BYTES = 4;
const RECOVERY_KEY_PREFIX = "POND-RK1";
const RECOVERY_KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DEFAULT_SCRYPT_WORK_FACTORS = {
  N: 131_072,
  r: 8,
  p: 1,
} as const;

export type PasswordInput = string;

export interface ScryptWorkFactors {
  N: number;
  r: number;
  p: number;
}

export interface CreateLibrarySecurityInput {
  libraryId: string;
  password: PasswordInput;
  passwordKdf?: ScryptWorkFactors;
  recoveryKdf?: ScryptWorkFactors;
}

export interface CreatedLibrarySecurity {
  manifest: LibrarySecurityManifest;
  masterKey: Buffer;
  recoveryKey: string;
}

export interface RotatePasswordInput {
  manifest: LibrarySecurityManifest;
  currentPassword: PasswordInput;
  newPassword: PasswordInput;
  kdf?: ScryptWorkFactors;
}

export interface RotateRecoveryKeyInput {
  manifest: LibrarySecurityManifest;
  password: PasswordInput;
  kdf?: ScryptWorkFactors;
}

export interface RotatedRecoveryKey {
  manifest: LibrarySecurityManifest;
  recoveryKey: string;
}

export interface RotateMasterKeyInput {
  manifest: LibrarySecurityManifest;
  password: PasswordInput;
  recoveryKey: string;
  passwordKdf?: ScryptWorkFactors;
  recoveryKdf?: ScryptWorkFactors;
}

export interface MasterKeyRotation {
  manifest: LibrarySecurityManifest;
  previousMasterKey: Buffer;
  masterKey: Buffer;
}

export class LibrarySecurityUnlockError extends Error {
  readonly code = "LIBRARY_SECURITY_UNLOCK_FAILED";

  constructor() {
    super("The Library key could not be unlocked.");
    this.name = "LibrarySecurityUnlockError";
  }
}

function passwordBytes(password: PasswordInput): Buffer {
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

function createKdf(workFactors?: ScryptWorkFactors): ScryptKdf {
  const factors = workFactors ?? DEFAULT_SCRYPT_WORK_FACTORS;
  return ScryptKdfSchema.parse({
    algorithm: "scrypt",
    version: 1,
    salt: randomBytes(LIBRARY_KDF_SALT_BYTES).toString("base64"),
    N: factors.N,
    r: factors.r,
    p: factors.p,
    keyBytes: LIBRARY_MASTER_KEY_BYTES,
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

async function wrapMasterKey(
  masterKey: Uint8Array,
  secret: Uint8Array,
  context: Pick<
    LibrarySecurityManifest,
    "format" | "version" | "libraryId" | "keyVersion"
  >,
  slot: "password" | "recoveryKey",
  workFactors?: ScryptWorkFactors,
): Promise<WrappedKey> {
  if (masterKey.byteLength !== LIBRARY_MASTER_KEY_BYTES) {
    throw new Error(
      `Library master keys must contain ${LIBRARY_MASTER_KEY_BYTES} bytes.`,
    );
  }
  const kdf = createKdf(workFactors);
  const wrappingKey = await deriveWrappingKey(secret, kdf);
  let nonce: Buffer | undefined;
  let aad: Buffer | undefined;
  try {
    nonce = randomBytes(LIBRARY_KEY_WRAP_NONCE_BYTES);
    aad = associatedData(context, slot, kdf);
    const cipher = createCipheriv("aes-256-gcm", wrappingKey, nonce, {
      authTagLength: LIBRARY_KEY_WRAP_TAG_BYTES,
    });
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([
      cipher.update(masterKey),
      cipher.final(),
    ]);
    return {
      kdf,
      cipher: {
        algorithm: "aes-256-gcm",
        nonce: nonce.toString("base64"),
        ciphertext: ciphertext.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
      },
    };
  } finally {
    wrappingKey.fill(0);
    nonce?.fill(0);
    aad?.fill(0);
  }
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

function encodeBase32(bytes: Uint8Array): string {
  let value = 0;
  let bits = 0;
  let encoded = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += RECOVERY_KEY_ALPHABET[(value >>> bits) & 31];
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0) encoded += RECOVERY_KEY_ALPHABET[(value << (5 - bits)) & 31];
  return encoded;
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

function generateRecoveryKey() {
  const secret = randomBytes(RECOVERY_KEY_ENTROPY_BYTES);
  const checksum = createHash("sha256")
    .update(secret)
    .digest()
    .subarray(0, RECOVERY_KEY_CHECKSUM_BYTES);
  const payload = Buffer.concat([secret, checksum]);
  checksum.fill(0);
  try {
    const encoded = encodeBase32(payload);
    const groups = encoded.match(/.{1,5}/g);
    if (!groups) throw new Error("Recovery Key generation failed.");
    return {
      encoded: `${RECOVERY_KEY_PREFIX}-${groups.join("-")}`,
      secret,
    };
  } finally {
    payload.fill(0);
  }
}

function manifestContext(libraryId: string, keyVersion: number) {
  return {
    format: "pond-library-security" as const,
    version: 1 as const,
    libraryId,
    keyVersion,
  };
}

export function zeroizeSecret(secret: Uint8Array): void {
  secret.fill(0);
}

export async function createLibrarySecurity(
  input: CreateLibrarySecurityInput,
): Promise<CreatedLibrarySecurity> {
  const libraryId = LibrarySecurityLibraryIdSchema.parse(input.libraryId);
  const context = manifestContext(libraryId, 1);
  const password = passwordBytes(input.password);
  let recovery: ReturnType<typeof generateRecoveryKey> | undefined;
  let masterKey: Buffer | undefined;
  try {
    recovery = generateRecoveryKey();
    masterKey = randomBytes(LIBRARY_MASTER_KEY_BYTES);
    const passwordWrap = await wrapMasterKey(
      masterKey,
      password,
      context,
      "password",
      input.passwordKdf,
    );
    const recoveryWrap = await wrapMasterKey(
      masterKey,
      recovery.secret,
      context,
      "recoveryKey",
      input.recoveryKdf,
    );
    const manifest = LibrarySecurityManifestSchema.parse({
      ...context,
      wrapping: {
        password: passwordWrap,
        recoveryKey: recoveryWrap,
      },
    });
    return { manifest, masterKey, recoveryKey: recovery.encoded };
  } catch (error) {
    masterKey?.fill(0);
    throw error;
  } finally {
    password.fill(0);
    recovery?.secret.fill(0);
  }
}

export async function unlockLibraryWithPassword(
  manifestInput: LibrarySecurityManifest,
  passwordInput: PasswordInput,
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

export async function rotateLibraryPassword(
  input: RotatePasswordInput,
): Promise<LibrarySecurityManifest> {
  const manifest = LibrarySecurityManifestSchema.parse(input.manifest);
  const newPassword = passwordBytes(input.newPassword);
  let masterKey: Buffer | undefined;
  try {
    masterKey = await unlockLibraryWithPassword(
      manifest,
      input.currentPassword,
    );
    const passwordWrap = await wrapMasterKey(
      masterKey,
      newPassword,
      manifest,
      "password",
      input.kdf,
    );
    return LibrarySecurityManifestSchema.parse({
      ...manifest,
      wrapping: {
        ...manifest.wrapping,
        password: passwordWrap,
      },
    });
  } finally {
    masterKey?.fill(0);
    newPassword.fill(0);
  }
}

export async function rotateLibraryRecoveryKey(
  input: RotateRecoveryKeyInput,
): Promise<RotatedRecoveryKey> {
  const manifest = LibrarySecurityManifestSchema.parse(input.manifest);
  let masterKey: Buffer | undefined;
  let recovery: ReturnType<typeof generateRecoveryKey> | undefined;
  try {
    masterKey = await unlockLibraryWithPassword(manifest, input.password);
    recovery = generateRecoveryKey();
    const recoveryWrap = await wrapMasterKey(
      masterKey,
      recovery.secret,
      manifest,
      "recoveryKey",
      input.kdf,
    );
    return {
      manifest: LibrarySecurityManifestSchema.parse({
        ...manifest,
        wrapping: {
          ...manifest.wrapping,
          recoveryKey: recoveryWrap,
        },
      }),
      recoveryKey: recovery.encoded,
    };
  } finally {
    masterKey?.fill(0);
    recovery?.secret.fill(0);
  }
}

export async function rotateLibraryMasterKey(
  input: RotateMasterKeyInput,
): Promise<MasterKeyRotation> {
  const manifest = LibrarySecurityManifestSchema.parse(input.manifest);
  if (manifest.keyVersion === Number.MAX_SAFE_INTEGER) {
    throw new Error("Library key version cannot be incremented.");
  }
  const password = passwordBytes(input.password);
  let previousMasterKey: Buffer | undefined;
  let recoveredMasterKey: Buffer | undefined;
  let recoverySecret: Buffer | undefined;
  let masterKey: Buffer | undefined;
  let completed = false;
  try {
    previousMasterKey = await unwrapMasterKey(manifest, "password", password);
    try {
      recoverySecret = recoveryKeyBytes(input.recoveryKey);
    } catch {
      throw new LibrarySecurityUnlockError();
    }
    recoveredMasterKey = await unwrapMasterKey(
      manifest,
      "recoveryKey",
      recoverySecret,
    );
    if (!timingSafeEqual(previousMasterKey, recoveredMasterKey)) {
      throw new LibrarySecurityUnlockError();
    }
    masterKey = randomBytes(LIBRARY_MASTER_KEY_BYTES);
    const context = manifestContext(
      manifest.libraryId,
      manifest.keyVersion + 1,
    );
    const passwordWrap = await wrapMasterKey(
      masterKey,
      password,
      context,
      "password",
      input.passwordKdf,
    );
    const recoveryWrap = await wrapMasterKey(
      masterKey,
      recoverySecret,
      context,
      "recoveryKey",
      input.recoveryKdf,
    );
    const rotation = {
      manifest: LibrarySecurityManifestSchema.parse({
        ...context,
        wrapping: {
          password: passwordWrap,
          recoveryKey: recoveryWrap,
        },
      }),
      previousMasterKey,
      masterKey,
    };
    completed = true;
    return rotation;
  } finally {
    if (!completed) {
      previousMasterKey?.fill(0);
      masterKey?.fill(0);
    }
    recoveredMasterKey?.fill(0);
    recoverySecret?.fill(0);
    password.fill(0);
  }
}
