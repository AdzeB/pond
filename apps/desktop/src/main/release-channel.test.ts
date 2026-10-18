import { describe, expect, it } from "vitest";
import { identityFor, releaseChannelFor } from "./release-channel";

describe("releaseChannelFor", () => {
  it("reads nightly from the prerelease the nightly workflow stamps", () => {
    expect(releaseChannelFor("1.0.2-nightly.20261018.42")).toBe("nightly");
  });

  it("treats releases and other prereleases as stable", () => {
    expect(releaseChannelFor("1.0.1")).toBe("stable");
    expect(releaseChannelFor("1.1.0-beta.1")).toBe("stable");
    expect(releaseChannelFor("1.0.2-nightlyish.1")).toBe("stable");
  });
});

describe("identityFor", () => {
  it("keeps nightly off every resource stable owns", () => {
    const stable = identityFor("stable");
    const nightly = identityFor("nightly");
    expect(nightly.appName).not.toBe(stable.appName);
    expect(nightly.libraryFolder).not.toBe(stable.libraryFolder);
    expect(nightly.ingestPort).not.toBe(stable.ingestPort);
    expect(stable.ownsSystemHandlers).toBe(true);
    expect(nightly.ownsSystemHandlers).toBe(false);
    expect(stable.allowPrerelease).toBe(false);
    expect(nightly.allowPrerelease).toBe(true);
  });
});
