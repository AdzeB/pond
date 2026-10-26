const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join, resolve } = require("node:path");

const APPEX = "Contents/PlugIns/Pond Extension.appex";
const ENTITLEMENTS = resolve(
  __dirname,
  "../../extension/safari/extension.entitlements",
);

function defaultSign() {
  const builder = require.resolve("electron-builder");
  return require(
    require.resolve("app-builder-lib/out/codeSign/macCodeSign.js", {
      paths: [builder],
    }),
  ).sign;
}

/** electron-builder skips Contents/PlugIns, so the Safari appex is signed with its own entitlements before the app seals it. */
exports.default = async function signMac(opts) {
  const appex = join(opts.app, APPEX);
  if (existsSync(appex) && opts.identity) {
    const args = [
      "--force",
      "--sign",
      opts.identity,
      "--options",
      "runtime",
      "--entitlements",
      ENTITLEMENTS,
    ];
    if (opts.identity !== "-") args.push("--timestamp");
    if (opts.keychain) args.push("--keychain", opts.keychain);
    execFileSync("codesign", [...args, appex], { stdio: "inherit" });
  }
  return defaultSign()(opts);
};
