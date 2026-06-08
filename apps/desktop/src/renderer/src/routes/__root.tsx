import { Shell } from "@pond/ui";
import { createRootRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Categorize } from "@/components/primitives/dialogs/categorize";
import { QuickCapture } from "@/components/primitives/dialogs/quick-capture";
import { DeepLinkBridge } from "@/effects/deep-link-bridge";

export const Route = createRootRoute({
  component: () => (
    <Shell.Body>
      <DeepLinkBridge />
      <QuickCapture.Root />
      <Categorize />
      <Outlet />
    </Shell.Body>
  ),
  notFoundComponent: () => <Navigate to="/" replace />,
});
