const { app, BrowserWindow } = require("electron");
const { mkdirSync, writeFileSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

app.setPath("userData", join(tmpdir(), "pond-extension-install-video"));

app.commandLine.appendSwitch("force-device-scale-factor", "2");
app.commandLine.appendSwitch("force-color-profile", "srgb");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

const WIDTH = 640;
const HEIGHT = 320;
const FPS = 30;
const FRAMES = 10.5 * FPS;

const only = process.argv
  .find((arg) => arg.startsWith("--frames="))
  ?.slice("--frames=".length)
  .split(",")
  .map((value) => Number(value));

app.whenReady().then(async () => {
  try {
    await render();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});

async function render() {
  const framesDir = join(tmpdir(), "pond-extension-install-frames");
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir);

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    useContentSize: true,
    show: false,
    frame: false,
    backgroundColor: "#ffffff",
    webPreferences: { backgroundThrottling: false },
  });

  win.webContents.on("console-message", (_event, _level, message) => {
    console.log("page:", message);
  });
  await win.loadFile(join(__dirname, "index.html"));
  const ready = await win.webContents.executeJavaScript(
    "document.fonts.ready.then(() => true).catch((error) => String(error))",
  );
  console.log("fonts", ready);
  const indices = only ?? Array.from({ length: FRAMES }, (_, index) => index);

  for (const index of indices) {
    const result = await win.webContents.executeJavaScript(
      `(() => { try { window.renderFrame(${index}); return "ok"; } catch (error) { return String(error && error.stack || error); } })()`,
    );
    if (result !== "ok") throw new Error(result);
    await new Promise((resolve) => setTimeout(resolve, 16));
    const image = await win.webContents.capturePage();
    if (index === indices[0]) {
      const size = image.getSize();
      console.log(`frame ${size.width}x${size.height}`);
    }
    writeFileSync(
      join(framesDir, `${String(index).padStart(4, "0")}.png`),
      image.toPNG(),
    );
  }
}
