import { describe, expect, it } from "vitest";
import { identityKeyFromCookies } from "./session-identity";

describe("identityKeyFromCookies", () => {
  it("decodes the numeric user id out of twitter's twid cookie", () => {
    const key = identityKeyFromCookies("twitter", [
      { name: "auth_token", value: "abc" },
      { name: "twid", value: "u%3D783214" },
    ]);
    expect(key).toBe("783214");
  });

  it("falls back to the decoded twid when the u= shape is missing", () => {
    const key = identityKeyFromCookies("twitter", [
      { name: "twid", value: "opaque-id" },
    ]);
    expect(key).toBe("opaque-id");
  });

  it("uses ds_user_id for instagram and threads", () => {
    const cookies = [{ name: "ds_user_id", value: "123456" }];
    expect(identityKeyFromCookies("instagram", cookies)).toBe("123456");
    expect(identityKeyFromCookies("threads", cookies)).toBe("123456");
  });

  it("returns null when the identity cookie is absent or empty", () => {
    expect(identityKeyFromCookies("twitter", [])).toBeNull();
    expect(
      identityKeyFromCookies("instagram", [{ name: "ds_user_id", value: "" }]),
    ).toBeNull();
  });

  it("returns null for sources without a stable identity cookie", () => {
    expect(
      identityKeyFromCookies("pinterest", [{ name: "twid", value: "u=1" }]),
    ).toBeNull();
  });
});
