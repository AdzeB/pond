import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function withoutFences(content) {
  let fence = null;
  return content
    .split("\n")
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = null;
        return "";
      }
      if (marker) {
        fence = marker[1];
        return "";
      }
      return line;
    })
    .join("\n");
}

function headings(content) {
  const lines = content.split("\n");
  return lines.flatMap((line, index) => {
    const atx = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (atx) return [{ level: atx[1].length, title: atx[2], index }];
    if (
      line.trim() &&
      !/^\s*(?:>|[-*+]\s)/.test(line) &&
      /^ {0,3}(?:=+|-+)\s*$/.test(lines[index + 1] ?? "")
    )
      return [
        {
          level: lines[index + 1].trim()[0] === "=" ? 1 : 2,
          title: line.trim(),
          index,
        },
      ];
    return [];
  });
}

function explicitAnchors(content) {
  return [
    ...content.matchAll(/<a\s+(?:id|name)=["']([^"']+)["']\s*><\/a>/g),
  ].map((match) => match[1]);
}

function headingSlug(title) {
  return title
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
    .replace(/ /g, "-");
}

function anchors(content) {
  const result = new Set(explicitAnchors(content));
  const used = new Set();
  for (const { title } of headings(content)) {
    const slug = headingSlug(title);
    let candidate = slug;
    let suffix = 0;
    while (used.has(candidate)) candidate = `${slug}-${++suffix}`;
    used.add(candidate);
    result.add(candidate);
  }
  return result;
}

function linkDestinations(content) {
  const links = [];
  for (const match of content.matchAll(/\]\(/g)) {
    let labelDepth = 1;
    for (let index = match.index - 1; index >= 0; index--) {
      let escapes = 0;
      for (let previous = index - 1; content[previous] === "\\"; previous--)
        escapes++;
      if (escapes % 2) continue;
      if (content[index] === "]") labelDepth++;
      if (content[index] === "[" && --labelDepth === 0) break;
    }
    if (labelDepth !== 0) continue;
    const start = match.index + match[0].length;
    let end = start;
    let depth = 1;
    let angle = false;
    for (; end < content.length; end++) {
      const character = content[end];
      if (character === "\\") {
        end++;
        continue;
      }
      if (character === "<") angle = true;
      if (character === ">") angle = false;
      if (!angle && character === "(") depth++;
      if (!angle && character === ")" && --depth === 0) break;
    }
    if (depth !== 0) continue;
    const destination = content.slice(start, end).trim();
    const angleDestination = destination.match(/^<([^>]+)>/);
    links.push(angleDestination?.[1] ?? destination.split(/\s+["']/)[0]);
  }
  for (const match of content.matchAll(
    /^ {0,3}\[[^\]\n]+\]:\s*(?:<([^>]+)>|(\S+))/gm,
  ))
    links.push(match[1] ?? match[2]);
  return links;
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

function outside(root, target) {
  const path = relative(root, target);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

function localTarget(repository, file, destination, errors) {
  const label = relative(repository, file);
  if (/^(?:file:|[A-Za-z]:[\\/]|[\\/~])/.test(destination)) {
    errors.push(`${label}: nonportable local link ${destination}`);
    return null;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(destination)) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(destination);
  } catch {
    errors.push(`${label}: malformed link encoding ${destination}`);
    return null;
  }
  const hash = decoded.indexOf("#");
  const path = (hash === -1 ? decoded : decoded.slice(0, hash)).split("?")[0];
  const fragment = hash === -1 ? "" : decoded.slice(hash + 1);
  const target = path ? resolve(dirname(file), path) : file;
  if (outside(repository, target)) {
    errors.push(`${label}: link escapes repository: ${destination}`);
    return null;
  }
  if (!existsSync(target)) {
    errors.push(`${label}: missing local target ${destination}`);
    return null;
  }
  if (outside(realpathSync(repository), realpathSync(target))) {
    errors.push(
      `${label}: link escapes repository through a symlink: ${destination}`,
    );
    return null;
  }
  if (fragment && target.endsWith(".md") && statSync(target).isFile()) {
    const targetAnchors = anchors(withoutFences(readFileSync(target, "utf8")));
    if (!targetAnchors.has(fragment))
      errors.push(`${label}: missing fragment ${destination}`);
  }
  return { target, fragment };
}

export function checkReferences(repository) {
  const root = resolve(repository);
  const bibliography = join(root, "references.md");
  const influenceIndex = join(root, "docs/references/influences.md");
  const inventory = join(root, "docs/references/inventory.md");
  const errors = [];
  const files = [
    bibliography,
    join(root, "docs/contributing/references-standard.md"),
    join(root, "AGENTS.md"),
    join(root, "CONTRIBUTING.md"),
    ...markdownFiles(join(root, "docs/references")),
  ];
  const cited = new Set();
  let sourceAnchors = [];
  for (const file of files) {
    if (!existsSync(file)) {
      errors.push(
        `Missing required reference document: ${relative(root, file)}`,
      );
      continue;
    }
    const content = withoutFences(readFileSync(file, "utf8"));
    const ids = explicitAnchors(content);
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id))
        errors.push(`${relative(root, file)}: duplicate anchor ${id}`);
      seen.add(id);
    }
    const links = linkDestinations(content);
    if (file === bibliography) {
      sourceAnchors = ids;
      const urls = new Set();
      for (const destination of links.filter((link) =>
        /^https?:\/\//.test(link),
      )) {
        let url;
        try {
          url = new URL(destination).href;
        } catch {
          errors.push(`references.md: invalid source URL ${destination}`);
          continue;
        }
        if (urls.has(url))
          errors.push(`references.md: duplicate source URL ${url}`);
        urls.add(url);
      }
    }
    for (const destination of links) {
      const link = localTarget(root, file, destination, errors);
      if (
        link?.target === bibliography &&
        link.fragment &&
        (file === influenceIndex || file === inventory)
      )
        cited.add(link.fragment);
    }
  }
  if (!existsSync(influenceIndex))
    errors.push(
      "Missing required reference document: docs/references/influences.md",
    );
  if (existsSync(bibliography) && sourceAnchors.length === 0)
    errors.push("references.md: bibliography has no explicit source anchors");
  for (const id of sourceAnchors) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
      errors.push(
        `references.md: source anchor must use lowercase kebab-case: ${id}`,
      );
    if (!cited.has(id))
      errors.push(
        `references.md: source ${id} is not cited in influences or inventory`,
      );
  }
  return errors;
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkReferences(repository);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else
    console.log("Reference records and local links passed offline validation.");
}
