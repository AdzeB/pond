import type { ListHarvestArgs } from "../list-types";
import { inPageScrollCollect } from "./scroll";

/** Builds the self-contained IIFE string, inlined via `.toString()`, run in the scrape window. */

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
