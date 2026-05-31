import { colorNear } from "./color";
import { FIELD_DESCRIPTORS } from "./fields";
import type { SaveLike } from "./fields/save-like";
import type { Clause, ComparatorId, Predicate, Query } from "./types";

export type { SaveLike } from "./fields/save-like";

export function matches(query: Query, save: SaveLike): boolean {
  return evalClause(query, save);
}

function evalClause(c: Clause, s: SaveLike): boolean {
  if (c.kind === "and") {
    if (c.clauses.length === 0) return true;
    return c.clauses.every((child) => evalClause(child, s));
  }
  if (c.kind === "or") {
    if (c.clauses.length === 0) return true;
    return c.clauses.some((child) => evalClause(child, s));
  }
  const ok = evalPredicate(c, s);
  return c.negate ? !ok : ok;
}

function evalPredicate(p: Predicate, s: SaveLike): boolean {
  const projected = FIELD_DESCRIPTORS[p.field].project(s);
  return runComparator(p.cmp, projected, p.value);
}

function runComparator(
  cmp: ComparatorId,
  projected: unknown,
  value: unknown,
): boolean {
  switch (cmp) {
    case "eq":
      return scalarEqual(projected, value);
    case "neq":
      return !scalarEqual(projected, value);
    case "in":
      return Array.isArray(value)
        ? value.some((v) => scalarEqual(projected, v))
        : false;
    case "nin":
      return Array.isArray(value)
        ? value.every((v) => !scalarEqual(projected, v))
        : true;
    case "lt":
      return numLike(projected) < resolveNumeric(value);
    case "lte":
      return numLike(projected) <= resolveNumeric(value);
    case "gt":
      return numLike(projected) > resolveNumeric(value);
    case "gte":
      return numLike(projected) >= resolveNumeric(value);
    case "between": {
      if (!Array.isArray(value) || value.length !== 2) return false;
      const lo = resolveNumeric(value[0]);
      const hi = resolveNumeric(value[1]);
      const x = numLike(projected);
      return x >= lo && x <= hi;
    }
    case "contains":
      return typeof projected === "string" && typeof value === "string"
        ? projected.includes(value.toLowerCase())
        : false;
    case "startsWith":
      return typeof projected === "string" && typeof value === "string"
        ? projected.startsWith(value.toLowerCase())
        : false;
    case "endsWith":
      return typeof projected === "string" && typeof value === "string"
        ? projected.endsWith(value.toLowerCase())
        : false;
    case "some":
      return Array.isArray(projected) && Array.isArray(value)
        ? value.some((v) => projected.includes(String(v).toLowerCase()))
        : false;
    case "every":
      return Array.isArray(projected) && Array.isArray(value)
        ? value.every((v) => projected.includes(String(v).toLowerCase()))
        : false;
    case "none":
      return Array.isArray(projected) && Array.isArray(value)
        ? value.every((v) => !projected.includes(String(v).toLowerCase()))
        : true;
    case "exists":
      return value ? projected != null : projected == null;
    case "near":
      return Array.isArray(projected) && typeof value === "string"
        ? colorNear(value, projected as string[])
        : false;
  }
}

function scalarEqual(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

function numLike(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Date.parse(v);
    if (Number.isFinite(n)) return n;
    const f = Number.parseFloat(v);
    return Number.isFinite(f) ? f : Number.NaN;
  }
  return Number.NaN;
}

function resolveNumeric(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    if (v.startsWith("P") || v.startsWith("-P") || v.startsWith("+P")) {
      const ms = isoDurationToMillis(v);
      if (ms !== null) return Date.now() + ms;
    }
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
    const f = Number.parseFloat(v);
    if (Number.isFinite(f)) return f;
  }
  return Number.NaN;
}

function isoDurationToMillis(input: string): number | null {
  const m = input.match(
    /^([+-]?)P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/,
  );
  if (!m) return null;
  const [, signRaw = "", y = "0", mo = "0", w = "0", d = "0"] = m;
  const days = Number(y) * 365 + Number(mo) * 30 + Number(w) * 7 + Number(d);
  if (!Number.isFinite(days) || days === 0) return 0;
  const sign = signRaw === "-" ? -1 : 1;
  return sign * days * 86_400_000;
}
