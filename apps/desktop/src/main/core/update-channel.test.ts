import { DEFAULT_PREFS } from "@pond/schema/db";
import { describe, expect, it } from "vitest";
import { installedChannel, withInstalledChannel } from "./update-channel";

describe("update channel", () => {
  it("reads nightly from a nightly version and stable from anything else", () => {
    expect(installedChannel("1.0.2-nightly.20261018.42")).toBe("nightly");
    expect(installedChannel("1.0.1")).toBe("stable");
    expect(installedChannel("1.0.2-beta.1")).toBe("stable");
  });

  it("follows the installed build until a channel is chosen", () => {
    expect(DEFAULT_PREFS.updates.channel).toBeUndefined();
    expect(
      withInstalledChannel(DEFAULT_PREFS, "1.0.2-nightly.20261018.42").updates
        .channel,
    ).toBe("nightly");

    const chosen = {
      ...DEFAULT_PREFS,
      updates: { ...DEFAULT_PREFS.updates, channel: "stable" as const },
    };
    expect(
      withInstalledChannel(chosen, "1.0.2-nightly.20261018.42").updates.channel,
    ).toBe("stable");
  });
});
