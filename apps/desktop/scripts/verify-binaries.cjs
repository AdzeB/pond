const { existsSync, readdirSync, rmSync, statSync } = require("node:fs");
const { join, sep } = require("node:path");
const { z } = require("zod");

/** Fails the pack when a bundled binary or the extension is missing; yt-dlp is fetched into userData at runtime. */
exports.default = async function verifyBinaries(context) {
  const platform = normalizePlatform(context.electronPlatformName);
  const resourcesDir = resolveResourcesDir(context, platform);
  const arch = normalizeArch(context.arch);
  pruneOnnxRuntime(resourcesDir, platform, arch);
  if (platform === "darwin") verifySharpRuntime(resourcesDir, arch);
  const ffmpegPath = join(resourcesDir, "bin", "ffmpeg");
  const nativeHostPath = join(resourcesDir, "bin", "pond-native-host");

  assertPresent(ffmpegPath, "ffmpeg");
  if (platform === "darwin") {
    assertPresent(nativeHostPath, "pond-native-host");
    assertPresent(
      join(resourcesDir, "extension", "manifest.json"),
      "browser extension",
    );
  }

  console.log(`[pond verify] bundled ffmpeg OK (${platform})`);
};

const ARCH_NAMES = ["ia32", "x64", "armv7l", "arm64", "universal"];

function normalizeArch(arch) {
  return z
    .union([
      z
        .number()
        .int()
        .min(0)
        .max(4)
        .transform((index) => ARCH_NAMES[index]),
      z.enum(ARCH_NAMES),
    ])
    .parse(arch);
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

function verifySharpRuntime(resourcesDir, arch) {
  if (arch !== "arm64" && arch !== "x64") return;
  const unpacked = join(resourcesDir, "app.asar.unpacked");
  const other = arch === "arm64" ? "x64" : "arm64";
  removeArchPackages(unpacked, `darwin-${other}`);
  const files = listFiles(unpacked);
  const runtime = files.find(
    (file) =>
      file.includes(`${sep}@img${sep}sharp-darwin-${arch}${sep}`) &&
      file.endsWith(".node"),
  );
  const libvips = files.find(
    (file) =>
      file.includes(`${sep}@img${sep}sharp-libvips-darwin-${arch}${sep}`) &&
      file.endsWith(".dylib"),
  );
  if (!runtime || !libvips) {
    throw new Error(
      `[pond verify] missing sharp darwin-${arch} runtime under ${unpacked}. ` +
        "An Intel Mac cannot launch without it.",
    );
  }
}

function removeArchPackages(root, token) {
  if (!existsSync(root)) return;
  const matches = listFiles(root).filter((file) => file.includes(token));
  const roots = new Set(
    matches.map((file) => {
      const parts = file.split(sep);
      const index = parts.findIndex((part) => part.includes(token));
      return parts.slice(0, index + 1).join(sep);
    }),
  );
  for (const path of roots) rmSync(path, { recursive: true, force: true });
}

function listFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true }).map((entry) =>
    join(root, String(entry)),
  );
}

exports.verifySharpRuntime = verifySharpRuntime;

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
