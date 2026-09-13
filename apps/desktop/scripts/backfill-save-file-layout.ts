import { homedir } from "node:os";
import { join } from "node:path";
import { backfillSaveFileLayoutsAtRoot } from "../src/main/core/save-file-layout-disk";

const root = process.argv[2] ?? join(homedir(), "Pond", "My Pond.pond");

console.log(`[save-file-layout-backfill] ${root}`);
const started = Date.now();
let lastLogged = 0;
const stats = await backfillSaveFileLayoutsAtRoot(root, {
  concurrency: 4,
  onProgress: (next, id) => {
    const shouldLog =
      next.migrated === 1 ||
      next.migrated - lastLogged >= 50 ||
      next.visited % 500 === 0;
    if (!shouldLog) return;
    lastLogged = next.migrated;
    console.log(
      JSON.stringify({ ...next, id, elapsedMs: Date.now() - started }),
    );
  },
});
console.log(
  JSON.stringify({ ...stats, elapsedMs: Date.now() - started, done: true }),
);
