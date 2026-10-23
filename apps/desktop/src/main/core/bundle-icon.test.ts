import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appBundlePath,
  hasCustomBundleIcon,
  setBundleIcon,
} from "./bundle-icon";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fakeBundle(): string {
  const root = mkdtempSync(join(tmpdir(), "pond-bundle-icon-"));
  roots.push(root);
  const bundle = join(root, "Pond.app");
  mkdirSync(join(bundle, "Contents", "MacOS"), { recursive: true });
  return bundle;
}

const ICON = join(
  __dirname,
  "../../../../../packages/icons/brand/tints/strawberry/default.png",
);

describe("appBundlePath", () => {
  it("finds the app bundle from a packaged macOS executable", () => {
    expect(
      appBundlePath({
        platform: "darwin",
        packaged: true,
        exePath: "/Applications/Pond.app/Contents/MacOS/Pond",
      }),
    ).toBe("/Applications/Pond.app");
  });

  it("leaves development and other platforms alone", () => {
    const exePath = "/repo/node_modules/electron/dist/Electron";
    expect(
      appBundlePath({ platform: "darwin", packaged: false, exePath }),
    ).toBeNull();
    expect(
      appBundlePath({ platform: "win32", packaged: true, exePath }),
    ).toBeNull();
  });
});

describe.skipIf(process.platform !== "darwin")("setBundleIcon", () => {
  it("keeps the chosen icon on the bundle until it is reset", async () => {
    const bundle = fakeBundle();

    await setBundleIcon(bundle, ICON);
    expect(hasCustomBundleIcon(bundle)).toBe(true);

    await setBundleIcon(bundle, null);
    expect(hasCustomBundleIcon(bundle)).toBe(false);
  });

  it("does nothing when resetting a bundle that has no custom icon", async () => {
    const bundle = fakeBundle();

    await setBundleIcon(bundle, null);
    expect(hasCustomBundleIcon(bundle)).toBe(false);
  });
});
