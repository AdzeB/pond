import type { ListHarvestArgs } from "../list-types";
import { inPageScrollCollect } from "./scroll";

export function buildItemExpression<Norm, Result>(
  normalizeFactory: () => Norm,
  harvestFn: (id: string, norm: Norm) => Result | Promise<Result>,
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

export function buildScrollListExpression<Norm, Result>(
  normalizeFactory: () => Norm,
  listFn: (
    args: ListHarvestArgs,
    scroll: ReturnType<typeof inPageScrollCollect>,
    norm: Norm,
  ) => Result | Promise<Result>,
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
