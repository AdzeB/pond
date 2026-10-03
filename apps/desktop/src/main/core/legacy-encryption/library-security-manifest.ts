import { z } from "zod";

export const LIBRARY_SECURITY_MANIFEST_FILENAME = "library-security.json";
export const LIBRARY_MASTER_KEY_BYTES = 32;
const LIBRARY_KEY_WRAP_NONCE_BYTES = 12;
export const LIBRARY_KEY_WRAP_TAG_BYTES = 16;
const LIBRARY_KDF_SALT_BYTES = 16;

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

export const ScryptKdfSchema = z
  .strictObject({
    algorithm: z.literal("scrypt"),
    version: z.literal(1),
    salt: canonicalBase64(LIBRARY_KDF_SALT_BYTES),
    N: z.number().int().min(16_384).max(131_072),
    r: z.number().int().min(1).max(8),
    p: z.number().int().min(1).max(4),
    keyBytes: z.literal(LIBRARY_MASTER_KEY_BYTES),
  })
  .refine((value) => (value.N & (value.N - 1)) === 0, {
    message: "Scrypt N must be a power of two.",
    path: ["N"],
  })
  .refine((value) => value.N * value.r <= 1_048_576, {
    message: "Scrypt memory cost exceeds the supported limit.",
  });

const WrappedKeySchema = z.strictObject({
  kdf: ScryptKdfSchema,
  cipher: z.strictObject({
    algorithm: z.literal("aes-256-gcm"),
    nonce: canonicalBase64(LIBRARY_KEY_WRAP_NONCE_BYTES),
    ciphertext: canonicalBase64(LIBRARY_MASTER_KEY_BYTES),
    tag: canonicalBase64(LIBRARY_KEY_WRAP_TAG_BYTES),
  }),
});

const LibrarySecurityLibraryIdSchema = z.string().trim().min(1).max(256);

export const LibrarySecurityManifestSchema = z.strictObject({
  format: z.literal("pond-library-security"),
  version: z.literal(1),
  libraryId: LibrarySecurityLibraryIdSchema,
  keyVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  wrapping: z.strictObject({
    password: WrappedKeySchema,
    recoveryKey: WrappedKeySchema,
  }),
});

export type LibrarySecurityManifest = z.infer<
  typeof LibrarySecurityManifestSchema
>;
export type ScryptKdf = z.infer<typeof ScryptKdfSchema>;
