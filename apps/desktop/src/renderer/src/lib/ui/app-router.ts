import type { AnyRouter } from "@tanstack/react-router";

/** Consumers like the MenuBridge sit outside the router context; the instance is stashed here so they can drive history imperatively. */
let current: AnyRouter | null = null;

export function setAppRouter(router: AnyRouter): void {
  current = router;
}

export function getAppRouter(): AnyRouter | null {
  return current;
}
