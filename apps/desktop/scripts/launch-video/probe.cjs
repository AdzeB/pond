/** Loads one stage page offscreen, then writes a screenshot and the bridge log for debugging. */
const { app, BrowserWindow } = require("electron");
const { join } = require("node:path");
const { writeFileSync, mkdirSync } = require("node:fs");
const { registerSchemes, handleSchemes, root } = require("./schemes.cjs");

const arg = (name, fallback) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.slice(name.length + 3) ?? fallback;
const page = arg("page", "launch-video-app.html");
const wait = Number(arg("wait", 3000));
const width = Number(arg("width", 1440));
const height = Number(arg("height", 900));
const run = arg("run", "");
const out = join(root, "probe");

registerSchemes();

setTimeout(() => {
  console.error("probe: timed out");
  app.exit(1);
}, wait + 30000);

app.whenReady().then(async () => {
  mkdirSync(out, { recursive: true });
  handleSchemes();
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });
  const errors = [];
  win.webContents.on("console-message", (e) => {
    if (e.level === "error" || e.level === "warning")
      errors.push(`${e.level}: ${e.message}`);
  });
  win.webContents.on("did-fail-load", (_e, code, description, url) =>
    errors.push(`load: ${code} ${description} ${url}`),
  );
  void win
    .loadURL(`stage://stage/${page}`)
    .catch((error) => errors.push(`load: ${error.message}`));
  await new Promise((r) => win.webContents.once("dom-ready", r));
  console.log("probe: dom-ready");
  await new Promise((r) => setTimeout(r, wait));
  if (run) {
    const result = await win.webContents.executeJavaScript(
      `(async () => { try { return await (${run}); } catch (error) { return "run failed: " + error.stack; } })()`,
    );
    console.log(
      "probe: run",
      typeof result === "string" ? result : JSON.stringify(result),
    );
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("probe: capturing");
  const image = await win.webContents.capturePage();
  console.log("probe: captured");
  writeFileSync(join(out, "probe.png"), image.toPNG());
  const bridge = await win.webContents.executeJavaScript(
    "JSON.stringify(window.__bridgeLog ?? null)",
  );
  writeFileSync(join(out, "bridge.json"), bridge);
  writeFileSync(join(out, "errors.txt"), errors.join("\n"));
  console.log(`probe: ${errors.length} console errors/warnings`);
  app.quit();
});
