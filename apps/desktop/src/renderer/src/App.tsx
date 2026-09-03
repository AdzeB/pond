import { Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { PondApi } from "../../preload";
import { CaptureShell } from "./components/library/capture-shell";
import { CollectShell } from "./components/library/collect-shell";
import { CommandMenuHost } from "./components/library/command-menu";
import { PreviewShell } from "./components/library/preview-shell";
import { ConfirmDialogHost } from "./components/shared/confirm-dialog";
import { PromptDialogHost } from "./components/shared/prompt-dialog";
import { ShortcutsSheetHost } from "./components/shared/shortcuts-sheet";
import { ToastHost } from "./components/shared/toast-host";
import { BootScreen } from "./components/shell/boot-screen";
import { ErrorBoundary } from "./components/shell/error-boundary";
import { ErrorScreen } from "./components/shell/error-screen";
import { AgentLibraryBridge } from "./effects/agent-library-bridge";
import { EnrichmentSweep } from "./effects/enrichment-sweep";
import { ExtensionCaptureToast } from "./effects/extension-capture-toast";
import { MenuRecentsBridge } from "./effects/menu-recents-bridge";
import { SyncStatusBridge } from "./effects/sync-status-bridge";
import { ThemeApplier } from "./effects/theme-applier";
import { UiSounds } from "./effects/ui-sounds";
import { pondScopedKey } from "./lib/pond-scope";
import { setAppRouter } from "./lib/ui/app-router";
import { syncPrimaryFromPath } from "./lib/ui/save-nav";
import { routeTree } from "./routeTree.gen";
import { useHydrateFolders } from "./stores/folders";
import { usePrefs } from "./stores/prefs";

declare global {
  interface Window {
    pond: PondApi;
    __pondShell?: {
      theme?: "light" | "dark";
      bgL?: number;
      bgC?: number;
      bgH?: number;
      fgL?: number;
      fgC?: number;
      fgH?: number;
      accentL?: number;
      accentC?: number;
      accentH?: number;
      contrast?: number;
      background?: string;
      pointerCursors?: boolean;
    };
  }
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof buildRouter>;
  }
}

const LAST_PATH_KEY = pondScopedKey("pond:lastPath");
const STARTUP_PAGE_KEY = "pond:startupPage";

const STARTUP_ROUTES: ReadonlyMap<string, string> = new Map([
  ["library", "/"],
  ["sources", "/sources"],
  ["trash", "/trash"],
]);

function readStored(key: string): string | null {
  if (!("localStorage" in globalThis)) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function initialPath(): string {
  const startup = readStored(STARTUP_PAGE_KEY) ?? "continue";
  if (startup === "settings") return "/settings/general";
  const startupRoute = STARTUP_ROUTES.get(startup);
  if (startup !== "continue" && startupRoute) return startupRoute;
  const last = readStored(LAST_PATH_KEY) || "/";
  if (last.startsWith("/dev")) return "/";
  return last;
}

function buildRouter(entry: string) {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [entry] }),
    defaultPreload: "intent",
    defaultErrorComponent: ({ error, reset }) => (
      <ErrorScreen error={error} reset={reset} />
    ),
  });
}

function AppContent() {
  const [router] = useState(() => buildRouter(initialPath()));

  useEffect(() => {
    const unsub = router.subscribe("onResolved", () => {
      const loc = router.state.location;
      try {
        localStorage.setItem(LAST_PATH_KEY, loc.pathname);
      } catch {}
      syncPrimaryFromPath(loc.pathname);
      setAppRouter(router);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    setAppRouter(router);
    syncPrimaryFromPath(router.state.location.pathname);
  }, [router]);

  return <RouterProvider router={router} />;
}

export function App() {
  const shell = new URLSearchParams(window.location.search).get("shell");
  if (shell === "preview") {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    return (
      <MotionConfig reducedMotion="user">
        <ThemeApplier />
        <PreviewShell id={id} />
      </MotionConfig>
    );
  }
  if (shell === "capture") {
    return <CaptureShell />;
  }
  if (shell === "collect") {
    return (
      <MotionConfig reducedMotion="user">
        <ThemeApplier />
        <CollectShell />
      </MotionConfig>
    );
  }
  return <LibraryApp />;
}

function LibraryApp() {
  useHydrateFolders();

  const [windowPrefs] = usePrefs("window");
  const startupPage = windowPrefs?.startupPage;
  useEffect(() => {
    if (!startupPage) return;
    try {
      localStorage.setItem(STARTUP_PAGE_KEY, startupPage);
    } catch {}
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
          <UiSounds />
          <MenuRecentsBridge />
          <AgentLibraryBridge />
          <SyncStatusBridge />
          <ExtensionCaptureToast />
          <EnrichmentSweep />
          <BootScreen />
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
          <ConfirmDialogHost />
          <PromptDialogHost />
          <CommandMenuHost />
          <ShortcutsSheetHost />
          <ToastHost />
        </Tooltip.Provider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
