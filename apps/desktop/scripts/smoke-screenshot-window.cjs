const {
  app,
  BrowserWindow,
  Menu,
  safeStorage,
  systemPreferences,
} = require("electron");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { promisify } = require("node:util");
const sharp = require("sharp");

safeStorage.isEncryptionAvailable = () => false;

const sandbox = mkdtempSync(join(tmpdir(), "pond-screenshot-window-smoke-"));
process.env.POND_SANDBOX = sandbox;
process.once("exit", () => rmSync(sandbox, { recursive: true, force: true }));
let pixels;
let captures = 0;
const originalExecFile = childProcess.execFile;
// Only the OS pixel acquisition is simulated; windows, IPC, storage and renderers are real.
childProcess.execFile = (file, args, options, callback) => {
  if (file !== "/usr/sbin/screencapture")
    return originalExecFile(file, args, options, callback);
  captures += 1;
  writeFileSync(args.at(-1), pixels);
  queueMicrotask(() => callback(null, "", ""));
};
childProcess.execFile[promisify.custom] = (file, args, options) =>
  new Promise((resolve, reject) => {
    childProcess.execFile(file, args, options, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
const mediaAccess =
  systemPreferences.getMediaAccessStatus.bind(systemPreferences);
systemPreferences.getMediaAccessStatus = (kind) =>
  kind === "screen" ? "granted" : mediaAccess(kind);

async function waitFor(read, label) {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const value = await read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
const find = (page) =>
  BrowserWindow.getAllWindows().find((win) =>
    win.webContents.getURL().includes(page),
  );
const query = (contents, name, input) =>
  contents.executeJavaScript(
    `window.pond.query(${JSON.stringify(name)}, ${JSON.stringify(input)})`,
  );
const timer = setTimeout(() => app.exit(1), 60000);
let running = false;
app.on("web-contents-created", (_, contents) => {
  contents.on("did-finish-load", async () => {
    if (running || !contents.getURL().includes("index.html")) return;
    running = true;
    try {
      await waitFor(
        () =>
          contents.executeJavaScript(
            "Boolean(window.pond && document.body.innerText.trim())",
          ),
        "Library",
      );
      await query(contents, "settings.setPrefs", {
        screenshots: {
          afterSaving: "return",
          askWhereToSave: true,
          copyToClipboard: false,
        },
        feedback: { notifications: { screenshot: false } },
      });
      await query(contents, "screenshots.capture", { mode: "area" });
      const organizer = await waitFor(
        () => find("screenshot.html"),
        "organizer",
      );
      await waitFor(
        () =>
          organizer.webContents.executeJavaScript(
            'document.body.innerText.includes("Save Screenshot") && Boolean(document.querySelector("form"))',
          ),
        "organizer renderer",
      );
      assert.equal(organizer.getParentWindow(), null);
      assert.equal(organizer.isModal(), false);
      const draft = await organizer.webContents.executeJavaScript(
        "window.pondScreenshot.draft()",
      );
      assert.equal(draft.width, 32);
      await query(contents, "screenshots.capture", { mode: "area" });
      assert.equal(captures, 1);
      assert.equal(find("screenshot.html"), organizer);
      const scoped = await organizer.webContents.executeJavaScript(
        '(async () => { try { await window.pond.query("saves.listPage", {limit:1}); return false; } catch { return true; } })()',
      );
      assert.equal(scoped, true);
      organizer.close();
      await waitFor(() => !find("screenshot.html"), "native cancellation");
      await assert.rejects(
        query(contents, "screenshots.finish", { token: draft.token }),
        /expired/,
      );
      await query(contents, "settings.setPrefs", {
        screenshots: { afterSaving: "open" },
      });
      await contents.executeJavaScript(
        'window.pond.openSettingsWindow({section:"screenshots"})',
      );
      const settings = await waitFor(() => find("settings.html"), "Settings");
      await waitFor(
        () =>
          settings.webContents.executeJavaScript(
            'document.body.innerText.includes("After Saving")',
          ),
        "Settings renderer",
      );
      BrowserWindow.fromWebContents(contents).destroy();
      const file = Menu.getApplicationMenu().items.find(
        (item) => item.label === "File",
      );
      const captureMenu = file.submenu.items.find(
        (item) => item.label === "Capture Screenshot",
      );
      const captureArea = captureMenu.submenu.items.find(
        (item) => item.label === "Capture Area",
      );
      await captureArea.click();
      const detached = await waitFor(
        () => find("screenshot.html"),
        "capture without Library",
      );
      await waitFor(
        () =>
          detached.webContents.executeJavaScript(
            "Boolean(document.querySelector('form'))",
          ),
        "detached organizer",
      );
      assert.equal(find("index.html"), undefined);
      const next = await detached.webContents.executeJavaScript(
        "window.pondScreenshot.draft()",
      );
      const saved = await query(detached.webContents, "screenshots.finish", {
        token: next.token,
        title: "Screenshot window smoke",
        notes: "Native window test",
      });
      assert.ok(saved.id);
      assert.equal(detached.isDestroyed(), false);
      detached.close();
      const reopened = await waitFor(
        () => find("index.html"),
        "after-save Library reopening",
      );
      await waitFor(
        () =>
          reopened.webContents.executeJavaScript(
            `Boolean(document.querySelector('[data-viewer-root]')) && Object.entries(localStorage).some(([key, value]) => key.includes('pond:lastPath') && value === ${JSON.stringify(`/save/${saved.id}`)})`,
          ),
        "saved image navigation",
      );
      await assert.rejects(
        query(reopened.webContents, "screenshots.finish", {
          token: next.token,
        }),
        /expired/,
      );
      await query(reopened.webContents, "settings.setPrefs", {
        screenshots: { afterSaving: "return" },
      });
      const route = await reopened.webContents.executeJavaScript(
        "Object.entries(localStorage).find(([key]) => key.includes('pond:lastPath'))?.[1]",
      );
      const direct = await query(reopened.webContents, "screenshots.capture", {
        mode: "screen",
      });
      assert.equal(direct.kind, "saved");
      assert.equal(
        await reopened.webContents.executeJavaScript(
          "Object.entries(localStorage).find(([key]) => key.includes('pond:lastPath'))?.[1]",
        ),
        route,
      );
      assert.equal(find("screenshot.html"), undefined);
      clearTimeout(timer);
      console.log(
        "SCREENSHOT_WINDOW_SMOKE_PASSED: native host, scoped IPC, singleton, cancel, capture without Library, save, after-save choices, direct save. OS pixel selection is simulated.",
      );
      app.exit(0);
    } catch (error) {
      clearTimeout(timer);
      const library = find("index.html");
      if (library)
        console.error(
          "SCREENSHOT_WINDOW_STATE",
          await library.webContents.executeJavaScript(
            "({text:document.body.innerText.slice(-2500), storage:Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.includes('lastPath')))})",
          ),
        );
      console.error("SCREENSHOT_WINDOW_SMOKE_FAILED", error);
      app.exit(1);
    }
  });
});
sharp({ create: { width: 32, height: 20, channels: 3, background: "red" } })
  .png()
  .toBuffer()
  .then((bytes) => {
    pixels = bytes;
    require("../out/main/index.js");
  });
