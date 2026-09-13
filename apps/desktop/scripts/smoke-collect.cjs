const { app } = require("electron");
const assert = require("node:assert/strict");
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const sandbox = mkdtempSync(join(tmpdir(), "pond-collect-smoke-"));
process.env.POND_SANDBOX = sandbox;
const watchDir = join(sandbox, "watch");
mkdirSync(watchDir);
const manualPath = join(sandbox, "manual.txt");
writeFileSync(manualPath, "Collect smoke manual import.");
writeFileSync(join(watchDir, "hello.txt"), "Collect smoke watched file.");
app.on("quit", () => rmSync(sandbox, { recursive: true, force: true }));
let started = false;
const timer = setTimeout(() => {
  console.error("COLLECT_SMOKE_FAILED: timed out");
  app.exit(1);
}, 45000);
app.on("web-contents-created", (_, contents) => {
  contents.on("did-finish-load", async () => {
    if (!contents.getURL().includes("index.html") || started) return;
    started = true;
    try {
      const result = await contents.executeJavaScript(`(async () => {
        const q = (name, input = {}) => window.pond.query(name, input);
        const inbox = await q("folders.create", { name: "Inbox" });
        const accepted = await q("captures.accept", {
          draft: {
            id: "collect-smoke-1",
            mode: "collect",
            metadata: { tags: [], folderIds: [] },
            items: [{ kind: "note", text: "Collect smoke", title: "Smoke note" }],
          },
        });
        const resumed = await q("captures.resume", {
          id: accepted.id,
          metadata: { tags: ["smoke"], folderIds: [inbox.id] },
        });
        async function complete() {
          for (let i = 0; i < 80; i++) {
            const jobs = await q("captures.list");
            const job = jobs.find((item) => item.id === accepted.id);
            if (job?.state === "complete" && job.saveIds[0]) return job;
            if (job?.state === "failed") return job;
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          throw new Error("Collect draft did not complete");
        }
        const finished = await complete();
        const save = finished.saveIds[0]
          ? await q("saves.get", { id: finished.saveIds[0] })
          : null;
        const manual = await q("saves.createManual", {
          sourceId: "collect-smoke-manual",
          filePaths: ${JSON.stringify([manualPath])},
        });
        await q("autoImport.set", {
          enabled: true,
          path: ${JSON.stringify(watchDir)},
          mode: "copy",
        });
        async function watched() {
          for (let i = 0; i < 60; i++) {
            const status = await q("autoImport.status");
            const hit = status.history.find((entry) => entry.name === "hello.txt");
            if (hit) return hit;
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
          return null;
        }
        const history = await watched();
        return {
          inbox,
          accepted,
          resumed,
          finished,
          save,
          manual,
          history,
        };
      })()`);
      assert.equal(result.accepted.state, "draft");
      assert.equal(result.finished.state, "complete");
      assert.ok(result.save?.tags?.includes("smoke"));
      assert.equal(result.manual.ok, true);
      assert.equal(result.history?.ok, true);
      assert.equal(result.history?.name, "hello.txt");
      console.log("COLLECT_SMOKE_OK");
      clearTimeout(timer);
      app.quit();
      setTimeout(() => app.exit(0), 1000);
    } catch (error) {
      clearTimeout(timer);
      console.error("COLLECT_SMOKE_FAILED", error);
      app.exit(1);
    }
  });
});
import("../out/main/index.js").catch((error) => {
  clearTimeout(timer);
  console.error("COLLECT_SMOKE_FAILED", error);
  app.exit(1);
});
