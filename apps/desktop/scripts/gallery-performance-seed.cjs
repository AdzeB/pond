const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");

async function main() {
  const [desktop, sandbox, size, initializer] = process.argv.slice(2);
  const count = Number(size);
  const owner = JSON.parse(
    fs.readFileSync(path.join(sandbox, "gallery-fixture-owner.json"), "utf8"),
  );
  assert.equal(owner.kind, "pond-gallery-performance");
  assert.equal(owner.size, count);
  assert.ok([1000, 10000, 100000].includes(count));
  assert.equal(process.env.POND_SANDBOX, sandbox);
  const requireDesktop = createRequire(path.join(desktop, "package.json"));
  requireDesktop("electron-log/main.js").transports.file.level = false;
  const sharp = requireDesktop("sharp");
  const ffmpeg = requireDesktop("ffmpeg-static");
  const Database = requireDesktop("better-sqlite3");
  const { initializePondSchema } = require(initializer);
  const media = path.join(sandbox, "fixture-media");
  const library = path.join(sandbox, "home/Pond/Gallery.pond");
  const indexes = path.join(sandbox, "app-data/indexes");
  for (const directory of [
    media,
    indexes,
    path.join(library, "items"),
    path.join(library, "trash"),
  ])
    fs.mkdirSync(directory, { recursive: true });
  await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#397fba" },
  })
    .png()
    .toFile(path.join(media, "reference.png"));
  const encode = (args) =>
    execFileSync(
      ffmpeg,
      ["-nostdin", "-hide_banner", "-loglevel", "error", ...args],
      { timeout: 30000 },
    );
  encode([
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=32x32:rate=2",
    "-t",
    "1",
    path.join(media, "animation.gif"),
  ]);
  encode([
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=24",
    "-t",
    "1",
    "-pix_fmt",
    "yuv420p",
    "-c:v",
    "libx264",
    path.join(media, "video.mp4"),
  ]);
  const attachment = (name, kind, mimeType, width, height) => {
    const bytes = fs.readFileSync(path.join(media, name));
    return {
      kind,
      path: name,
      mimeType,
      width,
      height,
      size: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    };
  };
  const png = attachment("reference.png", "cover", "image/png", 800, 600);
  const templates = [
    { mediaType: "image", files: [png] },
    {
      mediaType: "image",
      files: [attachment("animation.gif", "cover", "image/gif", 32, 32)],
    },
    {
      mediaType: "video",
      files: [
        attachment("video.mp4", "video", "video/mp4", 640, 360),
        { ...png, kind: "poster" },
      ],
    },
    { mediaType: "text", files: [] },
  ];
  const libraryId = crypto.randomBytes(16).toString("hex");
  fs.writeFileSync(
    path.join(library, "metadata.json"),
    JSON.stringify({
      id: libraryId,
      name: "Gallery benchmark",
      schemaVersion: 1,
      createdAt: Date.now(),
    }),
  );
  fs.writeFileSync(
    path.join(sandbox, "app-data/library-location.json"),
    JSON.stringify({ path: library, schemaVersion: 1, updatedAt: Date.now() }),
  );
  const folder = {
    id: "perf-folder",
    parent_id: null,
    name: "Performance Folder",
    color: null,
    sort_order: 0,
    created_at: Date.now(),
  };
  fs.writeFileSync(
    path.join(library, "organization.json"),
    JSON.stringify({
      schemaVersion: 1,
      updatedAt: Date.now(),
      data: { folders: [folder], views: [] },
    }),
  );
  const db = new Database(path.join(indexes, `${libraryId}.db`));
  initializePondSchema(db, () => false);
  const insert = db.prepare(
    "insert into saves (id,source,source_id,url,title,description,tags,files,media_type,width,height,file_size,saved_at,created_at,status) values (@id,'local',@id,@url,@title,@description,@tags,@files,@mediaType,@width,@height,@fileSize,@time,@time,'complete')",
  );
  const membership = db.prepare(
    "insert into save_folders(save_id,folder_id) values (?,'perf-folder')",
  );
  const stamp = db.prepare(
    "insert into library_scan(item_id,mtime_ms) values (?,?)",
  );
  const started = performance.now();
  try {
    db.transaction(() => {
      db.prepare(
        "insert into folders(id,parent_id,name,color,sort_order,created_at) values(@id,@parent_id,@name,@color,@sort_order,@created_at)",
      ).run(folder);
      for (let index = 0; index < count; index++) {
        const template = templates[index % templates.length];
        const id = `01QAPERF${String(index).padStart(18, "0")}`;
        const time = Date.now() - index * 1000;
        const title = `${index % 5 === 0 ? "target" : "reference"} ${index}`;
        const tags = ["qa", index % 2 ? "odd" : "even"];
        const url = `pond:local/${id}`;
        const description =
          template.mediaType === "text" ? "Local reference note" : null;
        const directory = path.join(library, "items", `${id}.info`);
        fs.mkdirSync(directory);
        const info = {
          schema: 3,
          id,
          source: "local",
          sourceId: id,
          url,
          title,
          description,
          tags,
          folderIds: index % 20 === 0 ? ["perf-folder"] : [],
          mediaType: template.mediaType,
          files: template.files,
          coverIndex: 0,
          width: template.files[0]?.width ?? null,
          height: template.files[0]?.height ?? null,
          savedAt: new Date(time).toISOString(),
          createdAt: new Date(time).toISOString(),
        };
        fs.writeFileSync(
          path.join(directory, "info.json"),
          JSON.stringify(info),
        );
        for (const file of template.files)
          fs.linkSync(
            path.join(media, file.path),
            path.join(directory, file.path),
          );
        insert.run({
          id,
          url,
          title,
          description,
          tags: JSON.stringify(tags),
          files: JSON.stringify(template.files),
          mediaType: template.mediaType,
          width: info.width,
          height: info.height,
          fileSize: template.files.reduce((sum, file) => sum + file.size, 0),
          time,
        });
        if (index % 20 === 0) membership.run(id);
        stamp.run(id, fs.statSync(path.join(directory, "info.json")).mtimeMs);
      }
    })();
    assert.equal(db.prepare("select count(*) as n from saves").get().n, count);
    assert.equal(
      db.prepare("select count(*) as n from save_folders").get().n,
      count / 20,
    );
    assert.equal(
      db
        .prepare(
          "select count(*) as n from saves_fts where saves_fts match 'target'",
        )
        .get().n,
      count / 5,
    );
    assert.equal(fs.readdirSync(path.join(library, "items")).length, count);
    const fixture = {
      size: count,
      generatedMs: performance.now() - started,
      mediaTemplates: templates.map((template) => template.mediaType),
      originals:
        "generated PNG, animated GIF and MP4; repeated through hardlinks; text notes",
      checks: [
        "actual application schema",
        "save count",
        "folder count",
        "keyword FTS count",
        "item directory count",
      ],
      generatedMedia: templates.flatMap((template) => template.files),
    };
    fs.writeFileSync(
      path.join(sandbox, "fixture.json"),
      `${JSON.stringify(fixture, null, 2)}\n`,
    );
    console.log(JSON.stringify(fixture));
  } finally {
    db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
