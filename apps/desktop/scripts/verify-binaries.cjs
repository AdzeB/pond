const { existsSync, statSync } = require("node:fs");
const { join } = require("node:path");

// ffmpeg ships in the bundle (yt-dlp is fetched at runtime into userData,
// so it is intentionally not bundled). Fail the pack if ffmpeg is missing
// so we never publish an artifact that can't mux downloaded video.
exports.default = async function verifyBinaries(context) {
  const platform = normalizePlatform(context.electronPlatformName);
  const resourcesDir = resolveResourcesDir(context, platform);
  const ffmpegPath = join(resourcesDir, "bin", "ffmpeg");
  const nativeHostPath = join(resourcesDir, "bin", "pond-native-host");

  assertPresent(ffmpegPath, "ffmpeg");
  if (platform === "darwin") {
    assertPresent(nativeHostPath, "pond-native-host");
  }

  console.log(`[pond verify] bundled ffmpeg OK (${platform})`);
};

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
