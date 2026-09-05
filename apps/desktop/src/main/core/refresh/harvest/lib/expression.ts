import type { ListHarvestArgs } from "../list-types";
import type { BrowserValidators } from "./browser-validation";
import { browserValidationSource } from "./browser-validation-source";
import { inPageScrollCollect } from "./scroll";

export function buildItemExpression<Norm, Result>(
  normalizeFactory: (validators: BrowserValidators) => Norm,
  harvestFn: (id: string, norm: Norm) => Result | Promise<Result>,
  id: string,
): string {
  const normSrc = `(${normalizeFactory.toString()})(validators)`;
  const fnSrc = `(${harvestFn.toString()})`;
  return `(async () => {
    ${browserValidationSource}
    const validators = PondHarvestValidation.browserValidators;
    const norm = ${normSrc};
    const id = ${JSON.stringify(id)};
    try { return await ${fnSrc}(id, norm); } catch (e) { return null; }
  })()`;
}

export function buildScrollListExpression<Norm, Result>(
  normalizeFactory: (validators: BrowserValidators) => Norm,
  listFn: (
    args: ListHarvestArgs,
    scroll: ReturnType<typeof inPageScrollCollect>,
    norm: Norm,
  ) => Result | Promise<Result>,
  args: ListHarvestArgs,
): string {
  const scrollSrc = `(${inPageScrollCollect.toString()})()`;
  const normSrc = `(${normalizeFactory.toString()})(validators)`;
  const fnSrc = `(${listFn.toString()})`;
  return `(async () => {
    ${browserValidationSource}
    const validators = PondHarvestValidation.browserValidators;
    const scroll = ${scrollSrc};
    const norm = ${normSrc};
    const args = ${JSON.stringify(args)};
    try { return await ${fnSrc}(args, scroll, norm); }
    catch (e) { return { ok: false, reason: 'timeout', error: String(e) }; }
  })()`;
}
