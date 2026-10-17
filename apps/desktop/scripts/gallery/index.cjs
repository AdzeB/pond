const { join } = require("node:path");
const { app, BrowserWindow } = require("electron");

const screenshot = process.argv.includes("--screenshot")
  ? process.argv[process.argv.indexOf("--screenshot") + 1]
  : null;

app.setName("Pond Gallery");

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1400,
    height: 1000,
    title: "Pond Gallery",
    backgroundColor: "#0a0a0a",
    show: !screenshot,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  window.webContents.on("console-message", (event) => {
    if (event.level === "error" || event.level === "warning") {
      console.log(`[gallery ${event.level}] ${event.message}`);
    }
  });
  await window.loadFile(join(__dirname, "../../out/gallery/gallery.html"));
  if (!screenshot) return;
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const height = await window.webContents.executeJavaScript(
    "document.documentElement.scrollHeight",
  );
  window.setContentSize(1400, Math.min(height, 6000));
  await new Promise((resolve) => setTimeout(resolve, 500));
  const image = await window.webContents.capturePage();
  require("node:fs").writeFileSync(screenshot, image.toPNG());
  console.log(`Saved ${screenshot}`);
  app.quit();
});

app.on("window-all-closed", () => app.quit());
