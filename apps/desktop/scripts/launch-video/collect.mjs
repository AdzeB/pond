/** Copies the curated saves out of a Pond library into stage fixtures. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const here = import.meta.dirname;
const library =
  process.env.POND_LIBRARY ?? join(homedir(), "Pond/Personal.pond");
const out = resolve(here, "../../.tmp/launch-video/fixtures");
const curated = JSON.parse(readFileSync(join(here, "library.json"), "utf8"));
const IMAGE = /\.(jpe?g|png|webp)$/i;

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "media"), { recursive: true });

function size(path) {
  const info = execFileSync(
    "sips",
    ["-g", "pixelWidth", "-g", "pixelHeight", path],
    { encoding: "utf8" },
  );
  const [, width] = info.match(/pixelWidth: (\d+)/);
  const [, height] = info.match(/pixelHeight: (\d+)/);
  return { width: Number(width), height: Number(height) };
}

const saves = curated.saves.map((entry, index) => {
  const dir = join(library, "items", `${entry.id}.info`);
  const info = JSON.parse(readFileSync(join(dir, "info.json"), "utf8"));
  const source = info.files.find(
    (file) => file.kind === "image" && IMAGE.test(file.path),
  );
  if (!source) throw new Error(`${entry.id} has no image file`);
  const target = join(out, "media", entry.id);
  mkdirSync(target, { recursive: true });
  const cover = join(target, "cover.jpg");
  execFileSync(
    "sips",
    [
      "-Z",
      "1600",
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "88",
      join(dir, source.path),
      "--out",
      cover,
    ],
    { stdio: "ignore" },
  );
  const bytes = readFileSync(cover);
  const { width, height } = size(cover);
  return {
    ...entry,
    index,
    source: info.source,
    sourceId: info.sourceId,
    url: info.url,
    author: info.author,
    siteName: info.siteName,
    description: info.description,
    publishedAt: info.publishedAt ? Date.parse(info.publishedAt) : null,
    dominantColors: info.userData?.dominantColors ?? [],
    file: {
      kind: "image",
      path: "cover.jpg",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: statSync(cover).size,
      mimeType: "image/jpeg",
      width,
      height,
    },
  };
});

writeFileSync(
  join(out, "library.json"),
  JSON.stringify({ folders: curated.folders, saves }, null, 2),
);
console.log(`collect: ${saves.length} saves into ${out}`);
