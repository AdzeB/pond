import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeNativeHostManifests } from "./manifests";

describe("native host manifests", () => {
  it("writes browser-specific manifests through the production operation", () => {
    const home = "/Users/test";
    const hostPath = "/Applications/Pond.app/pond-native-host";
    const chromeParent = join(
      home,
      "Library/Application Support/Google/Chrome",
    );
    const firefoxParent = join(home, "Library/Application Support/Mozilla");
    const writes = new Map<string, string>();

    writeNativeHostManifests({
      platform: "darwin",
      hostPath: () => hostPath,
      home: () => home,
      exists: (path) =>
        path === hostPath || path === chromeParent || path === firefoxParent,
      makeDirectory: () => {},
      writeFile: (path, body) => writes.set(path, body),
    });

    expect([...writes.values()].map((body) => JSON.parse(body))).toEqual([
      {
        name: "so.pond.host",
        description: "Pond",
        path: hostPath,
        type: "stdio",
        allowed_origins: [
          "chrome-extension://ihciihlcdkopghlpabpmnodncfdboplb/",
        ],
      },
      {
        name: "so.pond.host",
        description: "Pond",
        path: hostPath,
        type: "stdio",
        allowed_extensions: ["desktop@pond.so"],
      },
    ]);
  });

  it("registers Firefox before its support directory exists", () => {
    const writes: string[] = [];

    writeNativeHostManifests({
      platform: "darwin",
      hostPath: () => "/Applications/Pond.app/pond-native-host",
      home: () => "/Users/test",
      exists: (path) =>
        path === "/Applications/Pond.app/pond-native-host" ||
        path === "/Applications/Firefox.app",
      makeDirectory: () => {},
      writeFile: (path) => writes.push(path),
    });

    expect(writes).toEqual([
      "/Users/test/Library/Application Support/Mozilla/NativeMessagingHosts/so.pond.host.json",
    ]);
  });
});
