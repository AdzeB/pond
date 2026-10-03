import { expect, it } from "vitest";
import legacyFixture from "./legacy-package-fixture.json";
import {
  LibrarySecurityUnlockError,
  unlockLibraryWithPassword,
  unlockLibraryWithRecoveryKey,
  zeroizeSecret,
} from "./library-security";
import {
  LIBRARY_MASTER_KEY_BYTES,
  LibrarySecurityManifestSchema,
} from "./library-security-manifest";

function createFixture() {
  return {
    manifest: LibrarySecurityManifestSchema.parse(
      legacyFixture.manifest.security,
    ),
    masterKey: Buffer.from(legacyFixture.masterKey, "base64"),
    recoveryKey: legacyFixture.recoveryKey,
  };
}

function changeBase64Byte(value: string): string {
  const bytes = Buffer.from(value, "base64");
  bytes[0] = (bytes[0] ?? 0) ^ 1;
  return bytes.toString("base64");
}

it("decrypts a legacy master key with either the password or Recovery Key", async () => {
  const created = createFixture();
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
  const created = createFixture();

  await expect(
    unlockLibraryWithPassword(created.manifest, "wrong password"),
  ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);
  await expect(
    unlockLibraryWithRecoveryKey(created.manifest, "POND-RK1-WRONG-KEY"),
  ).rejects.toBeInstanceOf(LibrarySecurityUnlockError);

  zeroizeSecret(created.masterKey);
});

it("rejects authenticated wrapper and manifest tampering", async () => {
  const created = createFixture();
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

it("validates the legacy manifest before key derivation", () => {
  const created = createFixture();
  const serialized = JSON.stringify(created.manifest);

  expect(LibrarySecurityManifestSchema.parse(JSON.parse(serialized))).toEqual(
    created.manifest,
  );
  expect(serialized).not.toContain(legacyFixture.password);
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
