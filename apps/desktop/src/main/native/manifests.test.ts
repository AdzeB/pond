import { describe, expect, it } from "vitest";
import {
  chromiumNativeHostManifest,
  firefoxNativeHostManifest,
} from "./manifests";

describe("native host manifests", () => {
  it("keeps the Chromium host pinned to the Chrome extension id", () => {
    const manifest = JSON.parse(chromiumNativeHostManifest("/host")) as {
      allowed_origins: string[];
      allowed_extensions?: string[];
    };
    expect(manifest.allowed_origins).toEqual([
      "chrome-extension://ihciihlcdkopghlpabpmnodncfdboplb/",
    ]);
    expect(manifest.allowed_extensions).toBeUndefined();
  });

  it("allows the Firefox extension id without a Chrome origin", () => {
    const manifest = JSON.parse(firefoxNativeHostManifest("/host")) as {
      allowed_extensions: string[];
      allowed_origins?: string[];
    };
    expect(manifest.allowed_extensions).toEqual(["desktop@pond.so"]);
    expect(manifest.allowed_origins).toBeUndefined();
  });
});
