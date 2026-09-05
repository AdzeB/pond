const { app } = require("electron");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const sandbox = mkdtempSync(join(tmpdir(), "pond-cleanup-smoke-"));
process.env.POND_SANDBOX = sandbox;
app.on("quit", () => rmSync(sandbox, { recursive: true, force: true }));
let complete = false;
const timer = setTimeout(() => {
  console.error("SMOKE_FAILED: renderer did not become ready");
  app.exit(1);
}, 30000);
app.on("web-contents-created", (_, contents) => {
  contents.on("did-fail-load", (_, code, description) =>
    console.error("LOAD_FAILED", code, description),
  );
  contents.on("did-finish-load", async () => {
    if (!contents.getURL().includes("index.html") || complete) return;
    try {
      const state = await contents.executeJavaScript(`(async () => {
        await new Promise((resolve, reject) => {
          const started = Date.now();
          const poll = () => {
            if (document.querySelector('[data-slot="window"]') && document.body.innerText.trim()) resolve();
            else if (Date.now() - started > 15000) reject(new Error("React did not render visible content"));
            else setTimeout(poll, 50);
          };
          poll();
        });
        const info = await window.pond.query("library.info");
        const page = await window.pond.query("saves.listPage", { limit: 1 });
        const tags = await window.pond.query("tags.list");
        return { info, page, tags, root: Boolean(document.getElementById("root")), text: document.body.innerText.slice(0, 160) };
      })()`);
      assert.equal(state.root, true);
      assert.ok(state.text.trim());
      assert.ok(state.info.path.startsWith(sandbox));
      assert.ok(Array.isArray(state.page.rows));
      assert.ok(Array.isArray(state.tags));
      complete = true;
      clearTimeout(timer);
      console.log(
        "SMOKE_PASSED",
        JSON.stringify({
          render: state.text,
          saves: state.page.rows.length,
          tags: state.tags.length,
        }),
      );
      app.quit();
      setTimeout(() => app.exit(0), 1000);
    } catch (error) {
      clearTimeout(timer);
      console.error("SMOKE_FAILED", error);
      app.exit(1);
    }
  });
});
import("../out/main/index.js").catch((error) => {
  clearTimeout(timer);
  console.error("SMOKE_FAILED", error);
  app.exit(1);
});
