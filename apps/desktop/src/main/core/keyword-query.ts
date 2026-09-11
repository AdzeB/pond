import { saves } from "@pond/schema/db";
import { type SQL, sql } from "drizzle-orm";

type Keyword =
  | { kind: "term"; value: string; phrase: boolean }
  | { kind: "not"; child: Keyword }
  | { kind: "and" | "or"; left: Keyword; right: Keyword };

type Token =
  | { kind: "term"; value: string; phrase: boolean }
  | { kind: "and" | "or" | "not" | "open" | "close" };

function tokenize(query: string): Token[] {
  if (query.length > 4096) throw new Error("Search is too long.");
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < query.length) {
    const char = query[offset];
    if (!char || /\s/.test(char)) {
      offset += 1;
      continue;
    }
    if (char === "(" || char === ")" || char === "-") {
      tokens.push({
        kind: char === "(" ? "open" : char === ")" ? "close" : "not",
      });
      offset += 1;
      continue;
    }
    if (query.slice(offset, offset + 2) === "||") {
      tokens.push({ kind: "or" });
      offset += 2;
      continue;
    }
    const phrase = char === '"';
    if (phrase) offset += 1;
    let value = "";
    while (offset < query.length) {
      const current = query[offset] ?? "";
      if (phrase && current === '"') {
        offset += 1;
        break;
      }
      if (
        !phrase &&
        (/\s|[()]/.test(current) || query.slice(offset, offset + 2) === "||")
      )
        break;
      if (
        phrase &&
        current === "\\" &&
        ['"', "\\"].includes(query[offset + 1] ?? "")
      )
        offset += 1;
      value += query[offset] ?? "";
      offset += 1;
    }
    if (!phrase && ["AND", "OR", "NOT"].includes(value)) {
      tokens.push({
        kind: value === "AND" ? "and" : value === "OR" ? "or" : "not",
      });
    } else {
      value = value.replaceAll("*", "").trim();
      if (/[\p{L}\p{N}]/u.test(value))
        tokens.push({ kind: "term", value, phrase });
    }
    if (tokens.length > 128) throw new Error("Search has too many conditions.");
  }
  return tokens;
}

function parse(query: string, mode: "all" | "any"): Keyword | null {
  const tokens = tokenize(query);
  let position = 0;
  let depth = 0;
  const startsOperand = () =>
    ["term", "not", "open"].includes(tokens[position]?.kind ?? "");

  function operand(): Keyword {
    depth += 1;
    if (depth > 32) throw new Error("Search groups are nested too deeply.");
    const token = tokens[position++];
    let result: Keyword;
    if (token?.kind === "term") result = token;
    else if (token?.kind === "not") result = { kind: "not", child: operand() };
    else if (token?.kind === "open") {
      result = disjunction();
      if (tokens[position++]?.kind !== "close")
        throw new Error("Close the search group with a parenthesis.");
    } else throw new Error("Enter a keyword after the search operator.");
    depth -= 1;
    return result;
  }

  function conjunction(): Keyword {
    let left = operand();
    while (
      tokens[position]?.kind === "and" ||
      (mode === "all" && startsOperand())
    ) {
      if (tokens[position]?.kind === "and") position += 1;
      left = { kind: "and", left, right: operand() };
    }
    return left;
  }

  function disjunction(): Keyword {
    let left = conjunction();
    while (
      tokens[position]?.kind === "or" ||
      (mode === "any" && startsOperand())
    ) {
      if (tokens[position]?.kind === "or") position += 1;
      left = { kind: "or", left, right: conjunction() };
    }
    return left;
  }

  if (!tokens.length) return null;
  const result = disjunction();
  if (position !== tokens.length)
    throw new Error("Unexpected search operator or parenthesis.");
  return result;
}

function termQuery(term: Extract<Keyword, { kind: "term" }>): string {
  return `"${term.value.replaceAll('"', '""')}"${term.phrase ? "" : "*"}`;
}

export function compileKeywordWhere(
  query: string,
  mode: "all" | "any" = "all",
): SQL | undefined {
  const tree = parse(query, mode);
  function compile(node: Keyword): SQL {
    if (node.kind === "term")
      return sql`${saves.id} in (select id from saves_fts where saves_fts match ${termQuery(node)})`;
    if (node.kind === "not") return sql`not (${compile(node.child)})`;
    return node.kind === "and"
      ? sql`(${compile(node.left)}) and (${compile(node.right)})`
      : sql`(${compile(node.left)}) or (${compile(node.right)})`;
  }
  return tree ? compile(tree) : undefined;
}

interface Literal {
  term: Extract<Keyword, { kind: "term" }>;
  negative: boolean;
}

function alternatives(node: Keyword, negative = false): Literal[][] {
  if (node.kind === "term") return [[{ term: node, negative }]];
  if (node.kind === "not") return alternatives(node.child, !negative);
  const left = alternatives(node.left, negative);
  const right = alternatives(node.right, negative);
  const union = (node.kind === "or") !== negative;
  if (union) {
    if (left.length + right.length > 128)
      throw new Error("Search has too many alternatives.");
    return [...left, ...right];
  }
  if (left.length * right.length > 128)
    throw new Error("Search has too many alternatives.");
  return left.flatMap((a) => right.map((b) => [...a, ...b]));
}

export function toFtsMatchQuery(
  query: string,
  mode: "all" | "any" = "all",
): string | null {
  const tree = parse(query, mode);
  if (!tree) return null;
  const branches = alternatives(tree).map((branch) => {
    const include = branch
      .filter((literal) => !literal.negative)
      .map((literal) => termQuery(literal.term));
    const exclude = branch
      .filter((literal) => literal.negative)
      .map((literal) => termQuery(literal.term));
    if (!include.length)
      throw new Error(
        "This search needs the full-library keyword query to evaluate exclusions.",
      );
    const positive = include.join(" AND ");
    return exclude.length
      ? `(${positive}) NOT (${exclude.join(" OR ")})`
      : positive;
  });
  return branches.length === 1
    ? (branches[0] ?? null)
    : branches.map((branch) => `(${branch})`).join(" OR ");
}
