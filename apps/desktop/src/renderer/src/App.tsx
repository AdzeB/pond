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
import { Presentation } from "./components/save-presentation";
import { BackfillStatusBridge } from "./effects/backfill-status-bridge";
import { DeveloperApplier } from "./effects/developer-applier";
import { MenuBridge } from "./effects/menu-bridge";
import { SaveCompleteToast } from "./effects/save-complete-toast";
import { SensitiveSweep } from "./effects/sensitive-sweep";
import { SyncStatusBridge } from "./effects/sync-status-bridge";
import { ThemeApplier } from "./effects/theme-applier";
import { ToastHost } from "./effects/toast-host";
import { UndoRedoBridge } from "./effects/undo-redo-bridge";
import { routeTree } from "./routeTree.gen";

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

function buildRouter() {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
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
            <UndoRedoBridge />
            <MenuBridge />
            <SyncStatusBridge />
            <BackfillStatusBridge />
            <SaveCompleteToast />
            <SensitiveSweep />
            <ToastHost />
            <RouterProvider router={router} />
            <Presentation />
          </Toast.Provider>
        </Tooltip.Provider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
