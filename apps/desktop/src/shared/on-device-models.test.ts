import { describe, expect, it } from "vitest";
import {
  onDeviceModelVersion,
  TEXT_EMBEDDING_MODEL,
  VISUAL_MODEL,
} from "./on-device-models";

describe("on-device model identities", () => {
  it("include the pinned revision and preprocessing version", () => {
    expect(onDeviceModelVersion(TEXT_EMBEDDING_MODEL, 3)).toBe(
      `${TEXT_EMBEDDING_MODEL.id}@${TEXT_EMBEDDING_MODEL.revision}:3`,
    );
    expect(onDeviceModelVersion(VISUAL_MODEL, 2)).toBe(
      `${VISUAL_MODEL.id}@${VISUAL_MODEL.revision}:2`,
    );
  });
});
