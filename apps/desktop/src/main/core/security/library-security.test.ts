import { expect, it } from "vitest";
import {
  createLibrarySecurity,
  LibrarySecurityUnlockError,
  rotateLibraryMasterKey,
  rotateLibraryPassword,
  rotateLibraryRecoveryKey,
  unlockLibraryWithPassword,
  unlockLibraryWithRecoveryKey,
  zeroizeSecret,
} from "./library-security";
import {
  LIBRARY_MASTER_KEY_BYTES,
  LibrarySecurityManifestSchema,
  parseLibrarySecurityManifest,
  serializeLibrarySecurityManifest,
} from "./library-security-manifest";

const TEST_KDF = { N: 16_384, r: 8, p: 1 };

async function createFixture(password = "correct horse battery staple") {
  return createLibrarySecurity({
    libraryId: "library-test-id",
    password,
    passwordKdf: TEST_KDF,
    recoveryKdf: TEST_KDF,
  });
}

function changeBase64Byte(value: string): string {
  const bytes = Buffer.from(value, "base64");
  bytes[0] = (bytes[0] ?? 0) ^ 1;
  return bytes.toString("base64");
}

it("wraps one random master key for the password and Recovery Key", async () => {
  const created = await createFixture();
  const passwordKey = await unlockLibraryWithPassword(
    created.manifest,
    "correct horse battery staple",
  );
  const recoveryKey = await unlockLibraryWithRecoveryKey(
    created.manifest,
    created.recoveryKey,
  );

  expect(created.masterKey).toHaveLength(LIBRARY_MASTER_KEY_BYTES);
  expect(passwordKey).toEqual(created.masterKey);
  expect(recoveryKey).toEqual(created.masterKey);
  expect(created.recoveryKey).toMatch(
    /^POND-RK1-(?:[0-9A-HJKMNP-TV-Z]{1,5}-)*[0-9A-HJKMNP-TV-Z]{1,5}$/,
  );

  zeroizeSecret(passwordKey);
  zeroizeSecret(recoveryKey);
  zeroizeSecret(created.masterKey);
});

it("rejects wrong passwords and Recovery Keys without distinguishing them", async () => {
  const created = await createFixture();
  const other = await createLibrarySecurity({
    libraryId: "other-library",
    password: "other password",
    passwordKdf: TEST_KDF,
    recoveryKdf: TEST_KDF,
  });

  await expect(
    unlockLibraryWithPassword(created.manifest, "wrong password"),
  ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);
  await expect(
    unlockLibraryWithRecoveryKey(created.manifest, other.recoveryKey),
  ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);

  zeroizeSecret(created.masterKey);
  zeroizeSecret(other.masterKey);
});

it("rejects authenticated wrapper and manifest tampering", async () => {
  const created = await createFixture();
  const tamperedCiphertext = LibrarySecurityManifestSchema.parse({
    ...created.manifest,
    wrapping: {
      ...created.manifest.wrapping,
      password: {
        ...created.manifest.wrapping.password,
        cipher: {
          ...created.manifest.wrapping.password.cipher,
          ciphertext: changeBase64Byte(
            created.manifest.wrapping.password.cipher.ciphertext,
          ),
        },
      },
    },
  });
  const transplanted = LibrarySecurityManifestSchema.parse({
    ...created.manifest,
    libraryId: "different-library",
  });

  await expect(
    unlockLibraryWithPassword(
      tamperedCiphertext,
      "correct horse battery staple",
    ),
  ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);
  await expect(
    unlockLibraryWithRecoveryKey(transplanted, created.recoveryKey),
  ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);

  zeroizeSecret(created.masterKey);
});

it("rotates password and Recovery Key wrappers without changing the master key", async () => {
  const created = await createFixture();
  const passwordRotated = await rotateLibraryPassword({
    manifest: created.manifest,
    currentPassword: "correct horse battery staple",
    newPassword: "a new password",
    kdf: TEST_KDF,
  });
  await expect(
    unlockLibraryWithPassword(passwordRotated, "correct horse battery staple"),
  ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);
  const passwordKey = await unlockLibraryWithPassword(
    passwordRotated,
    "a new password",
  );

  const recoveryRotated = await rotateLibraryRecoveryKey({
    manifest: passwordRotated,
    password: "a new password",
    kdf: TEST_KDF,
  });
  await expect(
    unlockLibraryWithRecoveryKey(recoveryRotated.manifest, created.recoveryKey),
  ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);
  const recoveryKey = await unlockLibraryWithRecoveryKey(
    recoveryRotated.manifest,
    recoveryRotated.recoveryKey,
  );

  expect(passwordKey).toEqual(created.masterKey);
  expect(recoveryKey).toEqual(created.masterKey);

  zeroizeSecret(passwordKey);
  zeroizeSecret(recoveryKey);
  zeroizeSecret(created.masterKey);
});

it("prepares an authenticated master-key rotation with both key versions", async () => {
  const created = await createFixture();
  const rotation = await rotateLibraryMasterKey({
    manifest: created.manifest,
    password: "correct horse battery staple",
    recoveryKey: created.recoveryKey,
    passwordKdf: TEST_KDF,
    recoveryKdf: TEST_KDF,
  });
  const passwordKey = await unlockLibraryWithPassword(
    rotation.manifest,
    "correct horse battery staple",
  );
  const recoveryKey = await unlockLibraryWithRecoveryKey(
    rotation.manifest,
    created.recoveryKey,
  );

  expect(rotation.manifest.keyVersion).toBe(2);
  expect(rotation.previousMasterKey).toEqual(created.masterKey);
  expect(rotation.masterKey).not.toEqual(created.masterKey);
  expect(passwordKey).toEqual(rotation.masterKey);
  expect(recoveryKey).toEqual(rotation.masterKey);

  zeroizeSecret(passwordKey);
  zeroizeSecret(recoveryKey);
  zeroizeSecret(rotation.previousMasterKey);
  zeroizeSecret(rotation.masterKey);
  zeroizeSecret(created.masterKey);
});

it("validates and serializes only the portable non-secret manifest", async () => {
  const password = "never serialize this password";
  const created = await createFixture(password);
  const serialized = serializeLibrarySecurityManifest(created.manifest);

  expect(parseLibrarySecurityManifest(serialized)).toEqual(created.manifest);
  expect(serialized).not.toContain(password);
  expect(serialized).not.toContain(created.recoveryKey);
  expect(serialized).not.toContain(created.masterKey.toString("base64"));
  expect(() =>
    LibrarySecurityManifestSchema.parse({
      ...created.manifest,
      unexpected: true,
    }),
  ).toThrow();
  expect(() =>
    LibrarySecurityManifestSchema.parse({
      ...created.manifest,
      wrapping: {
        ...created.manifest.wrapping,
        password: {
          ...created.manifest.wrapping.password,
          kdf: {
            ...created.manifest.wrapping.password.kdf,
            N: 1,
          },
        },
      },
    }),
  ).toThrow();

  zeroizeSecret(created.masterKey);
});

it("zeroizes mutable secret buffers in place", () => {
  const secret = Buffer.from([1, 2, 3, 4]);
  const view = secret.subarray(1, 3);

  zeroizeSecret(view);

  expect(secret).toEqual(Buffer.from([1, 0, 0, 4]));
});
