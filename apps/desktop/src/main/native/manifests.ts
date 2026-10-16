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

const FIREFOX_NMH_TARGETS = [
  {
    dir: "Library/Application Support/Mozilla/NativeMessagingHosts",
    apps: [
      "Firefox.app",
      "Firefox Developer Edition.app",
      "Firefox Nightly.app",
    ],
  },
  {
    dir: "Library/Application Support/zen/NativeMessagingHosts",
    apps: ["Zen.app", "Zen Browser.app"],
  },
  {
    dir: "Library/Application Support/Zen/NativeMessagingHosts",
    apps: ["Zen.app", "Zen Browser.app"],
  },
  {
    dir: "Library/Application Support/LibreWolf/NativeMessagingHosts",
    apps: ["LibreWolf.app"],
  },
  {
    dir: "Library/Application Support/Floorp/NativeMessagingHosts",
    apps: ["Floorp.app"],
  },
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

function chromiumNativeHostManifest(hostPath: string): string {
  return hostManifest(hostPath, {
    allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
  });
}

function firefoxNativeHostManifest(hostPath: string): string {
  return hostManifest(hostPath, {
    allowed_extensions: [FIREFOX_EXTENSION_ID],
  });
}

interface NativeHostManifestDependencies {
  platform: NodeJS.Platform;
  hostPath: () => string;
  home: () => string;
  exists: (path: string) => boolean;
  makeDirectory: (path: string) => void;
  writeFile: (path: string, body: string) => void;
  warn: (...values: unknown[]) => void;
}

const defaultDependencies: NativeHostManifestDependencies = {
  platform: process.platform,
  hostPath: nativeHostBinaryPath,
  home: homedir,
  exists: existsSync,
  makeDirectory: (path) => mkdirSync(path, { recursive: true }),
  writeFile: (path, body) => writeFileSync(path, body, { encoding: "utf8" }),
  warn: (...values) => log.warn(...values),
};

export function writeNativeHostManifests(
  overrides: Partial<NativeHostManifestDependencies> = {},
): void {
  const dependencies = { ...defaultDependencies, ...overrides };
  if (dependencies.platform !== "darwin") return;

  const hostPath = dependencies.hostPath();
  if (!dependencies.exists(hostPath)) {
    dependencies.warn("[pond native] host binary missing", hostPath);
    return;
  }

  const home = dependencies.home();
  const targets = [
    ...CHROMIUM_NMH_DIRS.map((dir) => ({
      dir,
      apps: [],
      body: chromiumNativeHostManifest(hostPath),
    })),
    ...FIREFOX_NMH_TARGETS.map((target) => ({
      ...target,
      body: firefoxNativeHostManifest(hostPath),
    })),
  ];
  for (const { dir: relativeDirectory, apps, body } of targets) {
    const parent = join(home, relativeDirectory, "..");
    const installed = apps.some(
      (name) =>
        dependencies.exists(join("/Applications", name)) ||
        dependencies.exists(join(home, "Applications", name)),
    );
    if (!dependencies.exists(parent) && !installed) continue;
    const dir = join(home, relativeDirectory);
    try {
      dependencies.makeDirectory(dir);
      dependencies.writeFile(join(dir, HOST_FILENAME), body);
    } catch (err) {
      dependencies.warn(
        "[pond native] failed to write host manifest",
        dir,
        err,
      );
    }
  }
}
