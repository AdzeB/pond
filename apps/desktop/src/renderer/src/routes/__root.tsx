import { Shell } from "@pond/ui";
import { createRootRoute, Navigate, Outlet } from "@tanstack/react-router";
import { DeepLinkBridge } from "@/effects/deep-link-bridge";
import { Categorize } from "@/features/save/categorize";
import { QuickCapture } from "@/features/save/quick-capture";

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
