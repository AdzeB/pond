import { Toast, Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { useMemo } from "react";
import type { PondApi } from "../../preload";
import { Presentation } from "./components/save/presentation";
import { DeveloperApplier } from "./effects/developer-applier";
import { MenuBridge } from "./effects/menu-bridge";
import { SaveCompleteToast } from "./effects/save-complete-toast";
import { SaveShortcuts } from "./effects/save-shortcuts";
import { ThemeApplier } from "./effects/theme-applier";
import { ToastHost } from "./effects/toast-host";
import { UndoRedoBridge } from "./effects/undo-redo-bridge";
import { ViewShortcuts } from "./effects/view-shortcuts";
import { routeTree } from "./routeTree.gen";

declare global {
  interface Window {
    pond: PondApi;
    __pondShell?: {
      theme?: "light" | "dark" | "high-contrast";
      pointerCursors?: boolean;
      onboarded?: boolean;
    };
  }
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof buildRouter>;
  }
}

function resolveInitialEntries(): string[] {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("standalone") === "save") {
      const id = params.get("id");
      if (id) return [`/standalone/save/${encodeURIComponent(id)}`];
    }
  } catch {
    /* falls through to library home */
  }
  return ["/"];
}

function buildRouter() {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: resolveInitialEntries() }),
    defaultPreload: "intent",
  });
}

export function App() {
  const router = useMemo(() => buildRouter(), []);
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
          <Toast.Provider>
            <ThemeApplier />
            <DeveloperApplier />
            <ViewShortcuts />
            <SaveShortcuts />
            <UndoRedoBridge />
            <MenuBridge />
            <SaveCompleteToast />
            <ToastHost />
            <RouterProvider router={router} />
            <Presentation />
          </Toast.Provider>
        </Tooltip.Provider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
