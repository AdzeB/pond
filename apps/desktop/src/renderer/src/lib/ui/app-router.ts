import type { AnyRouter } from "@tanstack/react-router";

// The RouterProvider lives inside <App/>, but some consumers (e.g. the
// MenuBridge that dispatches native-menu actions) sit outside the router
// context. Stash the instance here so they can drive history imperatively.
let current: AnyRouter | null = null;

export function setAppRouter(router: AnyRouter): void {
  current = router;
}

export function getAppRouter(): AnyRouter | null {
  return current;
}
