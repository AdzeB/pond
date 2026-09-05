import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync, Visitor } from "oxc-parser";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const desktop = join(repository, "apps/desktop/src");

export function runtimeImports(
  source,
  filename = "module.ts",
  includeTypes = false,
) {
  const parsed = parseSync(filename, source);
  if (parsed.errors.length)
    throw new Error(
      `Cannot parse ${filename}: ${parsed.errors.map((error) => error.message).join("; ")}`,
    );
  const imports = [];
  new Visitor({
    ImportDeclaration(node) {
      const onlyTypes =
        node.importKind === "type" ||
        (node.specifiers.length > 0 &&
          node.specifiers.every(
            (entry) =>
              entry.type === "ImportSpecifier" && entry.importKind === "type",
          ));
      if (includeTypes || !onlyTypes) imports.push(node.source.value);
    },
    ExportNamedDeclaration(node) {
      const onlyTypes =
        node.exportKind === "type" ||
        (node.specifiers.length > 0 &&
          node.specifiers.every((entry) => entry.exportKind === "type"));
      if (node.source && (includeTypes || !onlyTypes))
        imports.push(node.source.value);
    },
    ExportAllDeclaration(node) {
      if (includeTypes || node.exportKind !== "type")
        imports.push(node.source.value);
    },
    ImportExpression(node) {
      if (node.source.type === "Literal" && node.source.raw?.startsWith('"'))
        imports.push(node.source.value);
      else if (
        node.source.type === "Literal" &&
        node.source.raw?.startsWith("'")
      )
        imports.push(node.source.value);
    },
  }).visit(parsed.program);
  return imports;
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "generated") return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(path) &&
      !/\.(test|d)\.tsx?$/.test(path) &&
      entry.name !== "routeTree.gen.ts"
      ? [path]
      : [];
  });
}

function resolveImport(source, specifier) {
  let base;
  if (specifier.startsWith("@/"))
    base = join(desktop, "renderer/src", specifier.slice(2));
  else if (specifier.startsWith("@shared/"))
    base = join(desktop, "shared", specifier.slice(8));
  else if (specifier.startsWith("@main/"))
    base = join(desktop, "main", specifier.slice(6));
  else if (specifier.startsWith("."))
    base = resolve(dirname(source), specifier);
  else return null;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  if (extname(base) === ".js") candidates.push(`${base.slice(0, -3)}.ts`);
  return (
    candidates.find(
      (candidate) => existsSync(candidate) && /\.tsx?$/.test(candidate),
    ) ?? null
  );
}

export function dependencyCycles(graph) {
  const index = new Map();
  const low = new Map();
  const stack = [];
  const active = new Set();
  const cycles = [];
  const visit = (node) => {
    const current = index.size;
    index.set(node, current);
    low.set(node, current);
    stack.push(node);
    active.add(node);
    for (const target of graph.get(node) ?? []) {
      if (!index.has(target)) {
        visit(target);
        low.set(node, Math.min(low.get(node), low.get(target)));
      } else if (active.has(target))
        low.set(node, Math.min(low.get(node), index.get(target)));
    }
    if (low.get(node) !== index.get(node)) return;
    const group = [];
    let member;
    do {
      member = stack.pop();
      active.delete(member);
      group.push(member);
    } while (member !== node);
    if (group.length > 1 || graph.get(node)?.includes(node))
      cycles.push(group.sort());
  };
  for (const node of graph.keys()) if (!index.has(node)) visit(node);
  return cycles;
}

function main() {
  const files = sourceFiles(desktop);
  const graph = new Map();
  const errors = [];
  for (const source of files) {
    const content = readFileSync(source, "utf8");
    const dependencies = runtimeImports(content, source)
      .map((specifier) => resolveImport(source, specifier))
      .filter(Boolean);
    graph.set(source, dependencies);
    const from = relative(desktop, source);
    const allDependencies = runtimeImports(content, source, true)
      .map((specifier) => resolveImport(source, specifier))
      .filter(Boolean);
    for (const target of allDependencies) {
      const to = relative(desktop, target);
      if (
        from.startsWith("renderer/src/shared/") &&
        /renderer\/src\/(features|app|dev|routes)\//.test(to)
      )
        errors.push(
          `Shared code depends on application code: ${from} -> ${to}`,
        );
      if (
        (from.startsWith("renderer/") && to.startsWith("main/")) ||
        (from.startsWith("main/") && to.startsWith("renderer/")) ||
        (from.startsWith("shared/") && /^(main|renderer|preload)\//.test(to))
      )
        errors.push(`Process implementation import: ${from} -> ${to}`);
      if (to === "main/index.ts" && from !== to)
        errors.push(`Startup entrypoint imported: ${from}`);
    }
  }
  for (const cycle of dependencyCycles(graph))
    errors.push(
      `Runtime dependency cycle:\n  ${cycle.map((path) => relative(desktop, path)).join("\n  ")}`,
    );
  if (errors.length) {
    for (const error of errors) process.stderr.write(`${error}\n`);
    process.exitCode = 1;
  } else
    process.stdout.write(
      `Architecture verified across ${files.length} desktop modules.\n`,
    );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
