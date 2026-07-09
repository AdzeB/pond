import { Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { useEffect, useMemo } from "react";
import type { PondApi } from "../../preload";
import { ErrorBoundary } from "./components/error-boundary";
import { ErrorScreen } from "./components/error-screen";
import { PondCustomiseDialog } from "./components/pond-customise-dialog";
import { Toaster } from "./components/toaster";
import { DeveloperApplier } from "./effects/developer-applier";
import { EnrichmentSweep } from "./effects/enrichment-sweep";
import { MenuBridge } from "./effects/menu-bridge";
import { MenuRecentsBridge } from "./effects/menu-recents-bridge";
import { SyncStatusBridge } from "./effects/sync-status-bridge";
import { ThemeApplier } from "./effects/theme-applier";
import { UndoRedoBridge } from "./effects/undo-redo-bridge";
import { setAppRouter } from "./lib/ui/app-router";
import { ContextMenuHost } from "./lib/ui/native-menu";
import { routeTree } from "./routeTree.gen";
import { usePrefs } from "./stores/prefs";

declare global {
  interface Window {
    pond: PondApi;
    __pondShell?: {
      theme?: "light" | "dark";
      baseL?: number;
      baseC?: number;
      baseH?: number;
      accentL?: number;
      accentC?: number;
      accentH?: number;
      contrast?: number;
      fgDir?: number;
      pointerCursors?: boolean;
    };
  }
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof buildRouter>;
  }
}

const LAST_PATH_KEY = "pond:lastPath";
const STARTUP_PAGE_KEY = "pond:startupPage";

// Fixed pages the "On startup" preference can pin to. "continue" is handled
// separately by restoring the persisted last path.
const STARTUP_ROUTES: Record<string, string> = {
  library: "/",
  // "sources" startup pref now lands on the analytics page; the everyday
  // sources surface lives in the dock tray.
  sources: "/analytics",
  trash: "/trash",
  settings: "/settings",
};

function readStored(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Resolve the initial route synchronously (before prefs finish loading over
// IPC) by reading a localStorage mirror of the startup preference. Defaults to
// resuming the last route; a full quit or reload both land you back here.
function initialPath(): string {
  const startup = readStored(STARTUP_PAGE_KEY) ?? "continue";
  if (startup !== "continue" && STARTUP_ROUTES[startup]) {
    return STARTUP_ROUTES[startup];
  }
  return readStored(LAST_PATH_KEY) || "/";
}

function buildRouter() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath()] }),
    defaultPreload: "intent",
    defaultErrorComponent: ({ error, reset }) => (
      <ErrorScreen error={error} reset={reset} />
    ),
  });
  // Memory history lives only in RAM, so a reload (Cmd+R) or relaunch would
  // otherwise reset us to "/". Persist the resolved path so "Continue where you
  // left off" can restore it on next launch.
  router.subscribe("onResolved", () => {
    try {
      localStorage.setItem(LAST_PATH_KEY, router.state.location.pathname);
    } catch {
      /* best-effort; navigation still works without persistence */
    }
  });
  return router;
}

export function App() {
  const router = useMemo(() => buildRouter(), []);

  // Expose the *rendered* router (the committed memo value) to non-context
  // consumers such as the native History menu. Registering here -- rather than
  // inside the useMemo factory -- avoids StrictMode's double-invoked factory
  // leaving the singleton pointed at a discarded orphan router.
  useEffect(() => {
    setAppRouter(router);
  }, [router]);

  // Mirror the startup preference into localStorage so the next cold launch can
  // resolve the initial route synchronously, before prefs load over IPC.
  const [windowPrefs] = usePrefs("window");
  const startupPage = windowPrefs?.startupPage;
  useEffect(() => {
    if (!startupPage) return;
    try {
      localStorage.setItem(STARTUP_PAGE_KEY, startupPage);
    } catch {
      /* best-effort; falls back to "continue" when unreadable */
    }
  }, [startupPage]);
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  );

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider>
          <ThemeApplier />
          <DeveloperApplier />
          <UndoRedoBridge />
          <MenuBridge />
          <MenuRecentsBridge />
          <SyncStatusBridge />
          <EnrichmentSweep />
          <ErrorBoundary>
            <RouterProvider router={router} />
            <PondCustomiseDialog />
          </ErrorBoundary>
          <ContextMenuHost />
          <Toaster />
        </Tooltip.Provider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
