import type { AnyRouter } from "@tanstack/react-router";

let current: AnyRouter | null = null;

export function setAppRouter(router: AnyRouter): void {
  current = router;
}

export function getAppRouter(): AnyRouter | null {
  return current;
}
