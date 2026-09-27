import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, expect, it, vi } from "vitest";
import { setAppRouter } from "@/shared/lib/app-router";
import "@/app/effects/save-library-bridge";
import { captureScreenshot } from "./launch-screenshot";

afterEach(() => vi.unstubAllGlobals());

it("leaves navigation to the main-owned after-saving preference", async () => {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ["/settings/screenshots"] }),
  });
  setAppRouter(router);
  vi.stubGlobal("pond", {
    query: vi.fn(async () => ({ kind: "saved", id: "captured-area" })),
  });
  await captureScreenshot("area");
  expect(router.history.location.pathname).toBe("/settings/screenshots");
});
