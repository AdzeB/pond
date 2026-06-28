import { Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { useMemo } from "react";
import type { PondApi } from "../../preload";
import { ErrorBoundary } from "./components/error-boundary";
import { ErrorScreen } from "./components/error-screen";
import { PondCustomiseDialog } from "./components/pond-customise-dialog";
import { Presentation } from "./components/save-presentation";
import { Toaster } from "./components/toaster";
import { BackfillStatusBridge } from "./effects/backfill-status-bridge";
import { DeveloperApplier } from "./effects/developer-applier";
import { EnrichmentSweep } from "./effects/enrichment-sweep";
import { GovernorStatusBridge } from "./effects/governor-status-bridge";
import { MenuBridge } from "./effects/menu-bridge";
import { PipelineStatusBridge } from "./effects/pipeline-status-bridge";
import { RefreshStatusBridge } from "./effects/refresh-status-bridge";
import { SyncStatusBridge } from "./effects/sync-status-bridge";
import { ThemeApplier } from "./effects/theme-applier";
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
    defaultErrorComponent: ({ error, reset }) => (
      <ErrorScreen error={error} reset={reset} />
    ),
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
          <ThemeApplier />
          <DeveloperApplier />
          <UndoRedoBridge />
          <MenuBridge />
          <SyncStatusBridge />
          <BackfillStatusBridge />
          <PipelineStatusBridge />
          <RefreshStatusBridge />
          <GovernorStatusBridge />
          <EnrichmentSweep />
          <ErrorBoundary>
            <RouterProvider router={router} />
            <Presentation />
            <PondCustomiseDialog />
          </ErrorBoundary>
          <Toaster />
        </Tooltip.Provider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
