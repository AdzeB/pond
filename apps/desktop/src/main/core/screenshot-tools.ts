import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

export type ScreenshotToolId = "native" | "cleanshot" | "shottr" | "pond";

export interface ScreenshotTool {
  id: ScreenshotToolId;
  label: string;
  installed: boolean;
}

interface AppReader {
  exists(path: string): boolean;
  entries(path: string): string[];
}

interface ScreenshotLauncher {
  platform: NodeJS.Platform;
  openExternal(url: string): Promise<void>;
  openApplication(name: string): Promise<void>;
}

const APP_DIRECTORIES = ["/Applications", "/System/Applications"];

const defaultReader: AppReader = {
  exists: existsSync,
  entries(path) {
    try {
      return readdirSync(path);
    } catch {
      return [];
    }
  },
};

const externalTools = [
  {
    id: "cleanshot" as const,
    label: "CleanShot X",
    appNames: ["CleanShot X.app"],
  },
  {
    id: "shottr" as const,
    label: "Shottr",
    appNames: ["Shottr.app"],
  },
];

export function listScreenshotTools(
  platform: NodeJS.Platform = process.platform,
  reader: AppReader = defaultReader,
): ScreenshotTool[] {
  const installedApps =
    platform === "darwin"
      ? new Set(
          APP_DIRECTORIES.flatMap((directory) =>
            reader.exists(directory) ? reader.entries(directory) : [],
          ),
        )
      : new Set<string>();
  return [
    {
      id: "native",
      label: "macOS Screenshot",
      installed: platform === "darwin",
    },
    ...externalTools.map((tool) => ({
      id: tool.id,
      label: tool.label,
      installed: tool.appNames.some((name) => installedApps.has(name)),
    })),
    { id: "pond", label: "Pond Capture", installed: true },
  ];
}

function defaultOpenApplication(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/open", ["-a", name], {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function defaultLauncher(): Promise<ScreenshotLauncher> {
  const { shell } = await import("electron");
  return {
    platform: process.platform,
    openExternal: (url) => shell.openExternal(url),
    openApplication: defaultOpenApplication,
  };
}

export async function launchScreenshotTool(
  requested: ScreenshotToolId,
  launcher?: ScreenshotLauncher,
  reader: AppReader = defaultReader,
): Promise<{
  ok: boolean;
  used: ScreenshotToolId;
  fallback: boolean;
  openPondCapture: boolean;
}> {
  const runtime = launcher ?? (await defaultLauncher());
  const available = new Map(
    listScreenshotTools(runtime.platform, reader).map((tool) => [
      tool.id,
      tool.installed,
    ]),
  );
  const selected =
    requested !== "pond" && !available.get(requested) ? "native" : requested;

  if (selected === "pond" || runtime.platform !== "darwin") {
    return {
      ok: true,
      used: "pond",
      fallback: selected !== requested,
      openPondCapture: true,
    };
  }
  if (selected === "cleanshot") {
    await runtime.openExternal("cleanshot://capture-area?action=save");
  } else if (selected === "shottr") {
    await runtime.openExternal("shottr://grab/area?then=save");
  } else {
    await runtime.openApplication("Screenshot");
  }
  return {
    ok: true,
    used: selected,
    fallback: selected !== requested,
    openPondCapture: false,
  };
}
