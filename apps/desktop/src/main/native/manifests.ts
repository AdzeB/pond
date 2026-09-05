import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EXTENSION_ID, NATIVE_HOST_NAME } from "@pond/schema/native";
import { app } from "electron";
import log from "electron-log/main.js";

const HOST_FILENAME = `${NATIVE_HOST_NAME}.json`;

const BROWSER_NMH_DIRS = [
  "Library/Application Support/Google/Chrome/NativeMessagingHosts",
  "Library/Application Support/Google/Chrome Canary/NativeMessagingHosts",
  "Library/Application Support/Google/Chrome for Testing/NativeMessagingHosts",
  "Library/Application Support/Chromium/NativeMessagingHosts",
  "Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts",
  "Library/Application Support/Microsoft Edge/NativeMessagingHosts",
  "Library/Application Support/Arc/User Data/NativeMessagingHosts",
  "Library/Application Support/Vivaldi/NativeMessagingHosts",
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

function manifestBody(hostPath: string): string {
  return `${JSON.stringify(
    {
      name: NATIVE_HOST_NAME,
      description: "Pond",
      path: hostPath,
      type: "stdio",
      allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
    },
    null,
    2,
  )}\n`;
}

export function writeNativeHostManifests(): void {
  if (process.platform !== "darwin") return;

  const hostPath = nativeHostBinaryPath();
  if (!existsSync(hostPath)) {
    log.warn("[pond native] host binary missing", hostPath);
    return;
  }

  const home = homedir();
  const body = manifestBody(hostPath);
  for (const rel of BROWSER_NMH_DIRS) {
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
