import { Dialog, Tooltip } from "@pond/ui";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ConversionDialogHost } from "@/features/library/components/conversion-dialog";
import { FolderPickerHost } from "@/features/library/components/folder-picker";
import { RenameDialogHost } from "@/features/library/components/rename-dialog";
import type { PondApi } from "../../../preload";
import { ExtensionCaptureToast } from "../features/captures/effects/extension-capture-toast";
import { NotificationStatusBridge } from "../features/downloads/effects/notification-status-bridge";
import { EnrichmentSweep } from "../features/enrichment/effects/enrichment-sweep";
import { CommandMenuHost } from "../features/library/components/command-menu";
import { useHydrateFolders } from "../features/library/state/folders";
import { ScreenshotIntakeSelection } from "../features/saves/effects/screenshot-intake-selection";
import { syncPrimaryFromPath } from "../features/saves/lib/save-nav";
import { InterfaceZoom } from "../features/settings/effects/interface-zoom";
import { ThemeApplier } from "../features/settings/effects/theme-applier";
import { UiSounds } from "../features/settings/effects/ui-sounds";
import { usePrefs } from "../features/settings/state/prefs";
import { SyncStatusBridge } from "../features/sources/effects/sync-status-bridge";
import { routeTree } from "../routeTree.gen";
import { ToastHost } from "../shared/components/toast-host/toast-host";
import { setAppRouter } from "../shared/lib/app-router";
import { dismissBootCover } from "../shared/lib/boot-cover";
import { pondScopedKey } from "../shared/lib/pond-scope";
import { BootScreen } from "./components/boot-screen/boot-screen";
import { ErrorBoundary } from "./components/error-boundary/error-boundary";
import { ErrorScreen } from "./components/error-screen";
import { Onboarding } from "./components/onboarding";
import { AgentLibraryBridge } from "./effects/agent-library-bridge";
import { MenuRecentsBridge } from "./effects/menu-recents-bridge";
import { SettingsProcessingBridge } from "./effects/settings-processing-bridge";
import "./effects/save-library-bridge";

const DuplicateReviewHost = lazy(() =>
  import("@/features/library/components/duplicate-review").then((module) => ({
    default: module.DuplicateReviewHost,
  })),
);
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
  const [router] = useState(() => {
    const next = buildRouter(initialPath());
    setAppRouter(next);
    return next;
  });

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
  useEffect(() => dismissBootCover(), []);
  return (
    <>
      <InterfaceZoom />
      <LibraryApp />
    </>
  );
}

function LibraryApp() {
  useHydrateFolders();

  const [windowPrefs] = usePrefs("window");
  const [systemPrefs] = usePrefs("system");
  const startupPage = windowPrefs?.startupPage;
  useEffect(() => {
    if (!startupPage) return;
    try {
      localStorage.setItem(STARTUP_PAGE_KEY, startupPage);
    } catch {}
  }, [startupPage]);
  useEffect(() => {
    document.documentElement.dataset.colorSpace = systemPrefs.displayColorSpace;
  }, [systemPrefs.displayColorSpace]);

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
      <HotkeysProvider
        defaultOptions={{
          hotkey: { ignoreInputs: true },
          hotkeySequence: { ignoreInputs: true },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <Tooltip.Provider>
            <ThemeApplier />
            <UiSounds />
            <NotificationStatusBridge />
            <MenuRecentsBridge />
            <AgentLibraryBridge />
            <SyncStatusBridge />
            <ExtensionCaptureToast />
            <EnrichmentSweep />
            <SettingsProcessingBridge />
            <ScreenshotIntakeSelection />
            <BootScreen />
            <Onboarding />
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
            <Dialog.Host />
            <FolderPickerHost />
            <RenameDialogHost />
            <Suspense fallback={null}>
              <DuplicateReviewHost />
            </Suspense>
            <ConversionDialogHost />
            <CommandMenuHost />
            <ToastHost />
          </Tooltip.Provider>
        </QueryClientProvider>
      </HotkeysProvider>
    </MotionConfig>
  );
}
