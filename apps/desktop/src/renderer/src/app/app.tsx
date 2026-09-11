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
import { ActionDialogHost } from "@/features/library/components/action-dialog/action-dialog";
import { ConversionDialogHost } from "@/features/library/components/conversion-dialog/conversion-dialog";
import { FolderPickerHost } from "@/features/library/components/folder-picker/folder-picker";
import type { PondApi } from "../../../preload";
import { ExtensionCaptureToast } from "../features/captures/effects/extension-capture-toast";
import { EnrichmentSweep } from "../features/enrichment/effects/enrichment-sweep";
import { CommandMenuHost } from "../features/library/components/command-menu/command-menu";
import { useHydrateFolders } from "../features/library/state/folders";
import { syncPrimaryFromPath } from "../features/saves/lib/save-nav";
import { ThemeApplier } from "../features/settings/effects/theme-applier";
import { UiSounds } from "../features/settings/effects/ui-sounds";
import { usePrefs } from "../features/settings/state/prefs";
import { SyncStatusBridge } from "../features/sources/effects/sync-status-bridge";
import { routeTree } from "../routeTree.gen";
import { ToastHost } from "../shared/components/toast-host/toast-host";
import { setAppRouter } from "../shared/lib/app-router";
import { pondScopedKey } from "../shared/lib/pond-scope";
import { BootScreen } from "./components/boot-screen/boot-screen";
import { ErrorBoundary } from "./components/error-boundary/error-boundary";
import { ErrorScreen } from "./components/error-screen/error-screen";
import { AgentLibraryBridge } from "./effects/agent-library-bridge";
import { EditableHotkeyGuard } from "./effects/editable-hotkey-guard";
import { MenuRecentsBridge } from "./effects/menu-recents-bridge";
import { CaptureShell } from "./windows/capture-shell/capture-shell";
import { CollectShell } from "./windows/collect-shell/collect-shell";

const DuplicateReviewHost = lazy(() =>
  import(
    "@/features/library/components/duplicate-review/duplicate-review"
  ).then((module) => ({ default: module.DuplicateReviewHost })),
);
const PreviewShell = lazy(() =>
  import("./windows/preview-shell/preview-shell").then((module) => ({
    default: module.PreviewShell,
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
        <HotkeysProvider
          defaultOptions={{
            hotkey: { ignoreInputs: true },
            hotkeySequence: { ignoreInputs: true },
          }}
        >
          <ThemeApplier />
          <EditableHotkeyGuard />
          <Suspense fallback={<div role="status">Loading preview…</div>}>
            <PreviewShell id={id} />
          </Suspense>
        </HotkeysProvider>
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
            <MenuRecentsBridge />
            <AgentLibraryBridge />
            <SyncStatusBridge />
            <ExtensionCaptureToast />
            <EnrichmentSweep />
            <BootScreen />
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
            <Dialog.Host />
            <FolderPickerHost />
            <ActionDialogHost />
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
