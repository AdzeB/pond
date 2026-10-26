/**
 * Safari exposes the context-menu API as `menus`, not `contextMenus`. Every other
 * engine Pond supports has both names, and WXT's `browser` polyfill does not alias
 * `contextMenus` for Safari, so callers that reach for `browser.contextMenus` throw
 * there.
 *
 * This resolves the namespace once so background code stays engine-agnostic instead
 * of branching at every call site.
 */

type MenuNamespace = typeof browser.contextMenus;

function resolve(): MenuNamespace {
  // SAFETY: both namespaces come from the browser's own extension API, so whichever
  // is present already satisfies MenuNamespace; the narrow shape only widens the
  // lookup to include Safari's name before we check one exists.
  const runtime = globalThis.browser as
    | { contextMenus?: MenuNamespace; menus?: MenuNamespace }
    | undefined;
  const menus = runtime?.contextMenus ?? runtime?.menus;
  if (!menus) {
    throw new Error("No context-menu API in this browser.");
  }
  return menus;
}

/** The context-menu namespace for this browser (`contextMenus`, or Safari's `menus`). */
export const contextMenus: MenuNamespace = resolve();
