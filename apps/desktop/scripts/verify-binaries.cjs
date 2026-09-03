const { existsSync, readdirSync, rmSync, statSync } = require("node:fs");
const { join } = require("node:path");

// ffmpeg ships in the bundle (yt-dlp is fetched at runtime into userData,
// so it is intentionally not bundled). Fail the pack if ffmpeg is missing
// so we never publish an artifact that can't mux downloaded video.
exports.default = async function verifyBinaries(context) {
  const platform = normalizePlatform(context.electronPlatformName);
  const resourcesDir = resolveResourcesDir(context, platform);
  pruneOnnxRuntime(resourcesDir, platform, normalizeArch(context.arch));
  const ffmpegPath = join(resourcesDir, "bin", "ffmpeg");
  const nativeHostPath = join(resourcesDir, "bin", "pond-native-host");

  assertPresent(ffmpegPath, "ffmpeg");
  if (platform === "darwin") {
    assertPresent(nativeHostPath, "pond-native-host");
  }

  console.log(`[pond verify] bundled ffmpeg OK (${platform})`);
};

const ARCH_NAMES = ["ia32", "x64", "armv7l", "arm64", "universal"];

function normalizeArch(arch) {
  return typeof arch === "number" ? ARCH_NAMES[arch] : arch;
}

function pruneOnnxRuntime(resourcesDir, platform, arch) {
  const runtimeRoot = join(
    resourcesDir,
    "app.asar.unpacked",
    "node_modules",
    "onnxruntime-node",
    "bin",
    "napi-v6",
  );
  if (!existsSync(runtimeRoot)) return;

  for (const platformName of readdirSync(runtimeRoot)) {
    const platformDir = join(runtimeRoot, platformName);
    if (platformName !== platform) {
      rmSync(platformDir, { recursive: true, force: true });
      continue;
    }
    if (!arch || arch === "universal") continue;
    for (const archName of readdirSync(platformDir)) {
      if (archName !== arch) {
        rmSync(join(platformDir, archName), { recursive: true, force: true });
      }
    }
  }
}

function normalizePlatform(electronPlatformName) {
  if (electronPlatformName === "mas") return "darwin";
  return electronPlatformName;
}

function resolveResourcesDir(context, platform) {
  if (platform === "darwin") {
    const productFilename = context.packager.appInfo.productFilename;
    return join(
      context.appOutDir,
      `${productFilename}.app`,
      "Contents",
      "Resources",
    );
  }
  return join(context.appOutDir, "resources");
}

function assertPresent(path, label) {
  if (!existsSync(path)) {
    throw new Error(
      `[pond verify] missing bundled ${label} at ${path}. ` +
        "Release builds must ship it. Confirm electron-builder " +
        "extraResources copied it.",
    );
  }
  if (statSync(path).size === 0) {
    throw new Error(`[pond verify] bundled ${label} at ${path} is empty.`);
  }
}
