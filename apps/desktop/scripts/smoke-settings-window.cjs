const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const sandbox = mkdtempSync(join(tmpdir(), "pond-settings-smoke-"));
process.env.POND_SANDBOX = sandbox;
process.once("exit", () => rmSync(sandbox, { recursive: true, force: true }));
let running = false;
const timer = setTimeout(() => {
  console.error("SETTINGS_SMOKE_FAILED: timed out");
  app.exit(1);
}, 45000);

async function waitFor(read, label) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const result = await read();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const settingsWindows = () =>
  BrowserWindow.getAllWindows().filter((win) =>
    win.webContents.getURL().includes("settings.html"),
  );

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
        "Library renderer",
      );
      const originalUrl = contents.getURL();
      await contents.executeJavaScript(
        'window.pond.openSettingsWindow({section:"appearance"})',
      );
      const settings = await waitFor(
        () => settingsWindows()[0],
        "Settings window",
      );
      await waitFor(
        () =>
          settings.webContents.executeJavaScript(
            'document.body.innerText.includes("Post Cover")',
          ),
        "Appearance settings",
      );
      assert.notEqual(settings.webContents.id, contents.id);
      assert.equal(settingsWindows().length, 1);
      await contents.executeJavaScript(
        'window.pond.openSettingsWindow({section:"viewer"})',
      );
      await waitFor(
        () =>
          settings.webContents.executeJavaScript(
            'document.body.innerText.includes("Spacebar Preview")',
          ),
        "viewer settings",
      );
      assert.equal(settingsWindows().length, 1);
      await contents.executeJavaScript(
        'window.pond.openSettingsWindow({section:"models"})',
      );
      await waitFor(
        () =>
          settings.webContents.executeJavaScript(
            'document.body.innerText.includes("Cloud Providers")',
          ),
        "provider settings",
      );
      assert.equal(contents.getURL(), originalUrl);
      await settings.webContents.executeJavaScript(
        'window.pond.query("settings.setPrefs", {window:{interfaceZoom:110}})',
      );
      await waitFor(
        () =>
          contents.executeJavaScript(
            'document.documentElement.style.zoom === "1.1"',
          ),
        "Library preference broadcast",
      );
      await waitFor(
        () =>
          settings.webContents.executeJavaScript(
            'document.documentElement.style.zoom === "1.1"',
          ),
        "Settings preference broadcast",
      );
      const scoped = await settings.webContents.executeJavaScript(
        '(async () => { try { await window.pond.query("saves.listPage", {limit:1}); return false; } catch { return true; } })()',
      );
      assert.equal(scoped, true);
      settings.close();
      await waitFor(() => settingsWindows().length === 0, "Settings close");
      assert.equal(contents.isDestroyed(), false);
      await contents.executeJavaScript(
        'window.pond.openSettingsWindow({section:"general"})',
      );
      await waitFor(() => settingsWindows().length === 1, "Settings reopen");
      BrowserWindow.fromWebContents(contents).destroy();
      app.emit("activate");
      const reopened = await waitFor(
        () =>
          BrowserWindow.getAllWindows().find((win) =>
            win.webContents.getURL().includes("index.html"),
          ),
        "Library activation beside Settings",
      );
      await waitFor(
        () =>
          reopened.webContents.executeJavaScript(
            "Boolean(window.pond && document.body.innerText.trim())",
          ),
        "reopened Library renderer",
      );
      assert.notEqual(reopened.webContents.id, contents.id);
      assert.equal(settingsWindows().length, 1);
      clearTimeout(timer);
      console.log(
        "SETTINGS_SMOKE_PASSED: singleton, section aliases, preference broadcast, scoped queries, close, Library activation",
      );
      app.exit(0);
    } catch (error) {
      clearTimeout(timer);
      console.error("SETTINGS_SMOKE_FAILED", error);
      app.exit(1);
    }
  });
});
require("../out/main/index.js");
