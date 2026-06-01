import type { ListHarvestArgs } from "../list-types";
import { inPageScrollCollect } from "./scroll";

// A harvest expression is a self-contained IIFE string evaluated inside the
// scrape window. It inlines the normalize helper and the in-page harvest
// function via `.toString()`, then calls the harvest function with the
// serialized argument. Per-source files only differ in which functions they
// inline, so the IIFE scaffolding lives here once.

export function buildItemExpression<Norm>(
  normalizeFactory: () => Norm,
  harvestFn: (id: string, norm: Norm) => unknown,
  id: string,
): string {
  const normSrc = `(${normalizeFactory.toString()})()`;
  const fnSrc = `(${harvestFn.toString()})`;
  return `(async () => {
    const norm = ${normSrc};
    const id = ${JSON.stringify(id)};
    try { return await ${fnSrc}(id, norm); } catch (e) { return null; }
  })()`;
}

export function buildScrollListExpression<Norm>(
  normalizeFactory: () => Norm,
  listFn: (
    args: ListHarvestArgs,
    scroll: ReturnType<typeof inPageScrollCollect>,
    norm: Norm,
  ) => unknown,
  args: ListHarvestArgs,
): string {
  const scrollSrc = `(${inPageScrollCollect.toString()})()`;
  const normSrc = `(${normalizeFactory.toString()})()`;
  const fnSrc = `(${listFn.toString()})`;
  return `(async () => {
    const scroll = ${scrollSrc};
    const norm = ${normSrc};
    const args = ${JSON.stringify(args)};
    try { return await ${fnSrc}(args, scroll, norm); }
    catch (e) { return { ok: false, reason: 'timeout', error: String(e) }; }
  })()`;
}
