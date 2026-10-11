import { describe, expect, it } from "vitest";
import { EMBEDDING_MODEL, onDeviceModelVersion } from "./on-device-models";

describe("on-device model identities", () => {
  it("include the pinned revision and preprocessing version", () => {
    expect(onDeviceModelVersion(EMBEDDING_MODEL, 4)).toBe(
      `${EMBEDDING_MODEL.id}@${EMBEDDING_MODEL.revision}:4`,
    );
    expect(onDeviceModelVersion(EMBEDDING_MODEL, 3)).toBe(
      `${EMBEDDING_MODEL.id}@${EMBEDDING_MODEL.revision}:3`,
    );
  });
});
