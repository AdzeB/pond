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
import { Toaster } from "./components/toaster";
import { DeveloperApplier } from "./effects/developer-applier";
import { EnrichmentSweep } from "./effects/enrichment-sweep";
import { MenuBridge } from "./effects/menu-bridge";
import { MenuRecentsBridge } from "./effects/menu-recents-bridge";
import { SyncStatusBridge } from "./effects/sync-status-bridge";
import { ThemeApplier } from "./effects/theme-applier";
import { UndoRedoBridge } from "./effects/undo-redo-bridge";
import { pondScopedKey } from "./lib/pond-scope";
import { setAppRouter } from "./lib/ui/app-router";
import { ContextMenuHost } from "./lib/ui/native-menu";
import { routeTree } from "./routeTree.gen";
import { usePrefs } from "./stores/prefs";
import { settingsModal } from "./stores/settings-modal";

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

/** Last path is pond-scoped because a route can point at a save that exists in only one library; the startup-page mirror is app-level like the window prefs it shadows. */
const LAST_PATH_KEY = pondScopedKey("pond:lastPath");
const STARTUP_PAGE_KEY = "pond:startupPage";

/** "continue" is not listed; it is handled by restoring the persisted last path. "settings" is not listed either; it lands on "/" and opens the settings modal after mount. */
const STARTUP_ROUTES: Record<string, string> = {
  library: "/",
  sources: "/sources",
  trash: "/trash",
};

function readStored(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Reads the localStorage mirror of the startup preference so the initial route resolves synchronously, before prefs finish loading over IPC. */
function initialPath(): string {
  const startup = readStored(STARTUP_PAGE_KEY) ?? "continue";
  if (startup === "settings") return "/";
  if (startup !== "continue" && STARTUP_ROUTES[startup]) {
    return STARTUP_ROUTES[startup];
  }
  const last = readStored(LAST_PATH_KEY) || "/";
  /** Persisted paths from before settings moved into a modal would 404. */
  return last.startsWith("/settings") ? "/" : last;
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
  /** Memory history resets to "/" on reload or relaunch; persist the resolved path so "Continue where you left off" can restore it. */
  router.subscribe("onResolved", () => {
    try {
      localStorage.setItem(LAST_PATH_KEY, router.state.location.pathname);
    } catch {
      /** Best-effort; navigation still works without persistence. */
    }
  });
  return router;
}

export function App() {
  const router = useMemo(() => buildRouter(), []);

  /** Register the committed router here, not in the useMemo factory, so StrictMode's double-invoked factory cannot leave the singleton pointed at a discarded router. */
  useEffect(() => {
    setAppRouter(router);
  }, [router]);

  /** The "settings" startup page lands on "/" and opens the modal on top. */
  useEffect(() => {
    if (readStored(STARTUP_PAGE_KEY) === "settings") settingsModal.open();
  }, []);

  /** Mirror the startup preference into localStorage so the next cold launch resolves the initial route before prefs load over IPC. */
  const [windowPrefs] = usePrefs("window");
  const startupPage = windowPrefs?.startupPage;
  useEffect(() => {
    if (!startupPage) return;
    try {
      localStorage.setItem(STARTUP_PAGE_KEY, startupPage);
    } catch {
      /** Best-effort; falls back to "continue" when unreadable. */
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
          </ErrorBoundary>
          <ContextMenuHost />
          <Toaster />
        </Tooltip.Provider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
