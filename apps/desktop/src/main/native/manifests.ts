import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  EXTENSION_ID,
  FIREFOX_EXTENSION_ID,
  NATIVE_HOST_NAME,
} from "@pond/schema/native";
import { app } from "electron";
import log from "electron-log/main.js";

const HOST_FILENAME = `${NATIVE_HOST_NAME}.json`;

const CHROMIUM_NMH_DIRS = [
  "Library/Application Support/Google/Chrome/NativeMessagingHosts",
  "Library/Application Support/Google/Chrome Canary/NativeMessagingHosts",
  "Library/Application Support/Google/Chrome for Testing/NativeMessagingHosts",
  "Library/Application Support/Chromium/NativeMessagingHosts",
  "Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts",
  "Library/Application Support/Microsoft Edge/NativeMessagingHosts",
  "Library/Application Support/Arc/User Data/NativeMessagingHosts",
  "Library/Application Support/Vivaldi/NativeMessagingHosts",
] as const;

const FIREFOX_NMH_DIRS = [
  "Library/Application Support/Mozilla/NativeMessagingHosts",
  "Library/Application Support/zen/NativeMessagingHosts",
  "Library/Application Support/Zen/NativeMessagingHosts",
  "Library/Application Support/librewolf/NativeMessagingHosts",
  "Library/Application Support/Floorp/NativeMessagingHosts",
] as const;

function nativeHostBinaryPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "bin", "pond-native-host");
  }
  const candidates = [
    join(app.getAppPath(), "resources", "bin", "pond-native-host"),
    join(app.getAppPath(), "..", "resources", "bin", "pond-native-host"),
    join(process.cwd(), "resources", "bin", "pond-native-host"),
  ];
  const found = candidates.find((p) => existsSync(p));
  return found ?? join(process.cwd(), "resources", "bin", "pond-native-host");
}

function hostManifest(
  hostPath: string,
  allow: { allowed_origins: string[] } | { allowed_extensions: string[] },
): string {
  return `${JSON.stringify(
    {
      name: NATIVE_HOST_NAME,
      description: "Pond",
      path: hostPath,
      type: "stdio",
      ...allow,
    },
    null,
    2,
  )}\n`;
}

export function chromiumNativeHostManifest(hostPath: string): string {
  return hostManifest(hostPath, {
    allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
  });
}

export function firefoxNativeHostManifest(hostPath: string): string {
  return hostManifest(hostPath, {
    allowed_extensions: [FIREFOX_EXTENSION_ID],
  });
}

export function writeNativeHostManifests(): void {
  if (process.platform !== "darwin") return;

  const hostPath = nativeHostBinaryPath();
  if (!existsSync(hostPath)) {
    log.warn("[pond native] host binary missing", hostPath);
    return;
  }

  const home = homedir();
  const targets = [
    { dirs: CHROMIUM_NMH_DIRS, body: chromiumNativeHostManifest(hostPath) },
    { dirs: FIREFOX_NMH_DIRS, body: firefoxNativeHostManifest(hostPath) },
  ];
  for (const { dirs, body } of targets) {
    for (const rel of dirs) {
      const parent = join(home, rel, "..");
      if (!existsSync(parent)) continue;
      const dir = join(home, rel);
      try {
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, HOST_FILENAME), body, { encoding: "utf8" });
      } catch (err) {
        log.warn("[pond native] failed to write host manifest", dir, err);
      }
    }
  }
}
