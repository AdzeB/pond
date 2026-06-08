import { Shell } from "@pond/ui";
import { createRootRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Categorize } from "@/components/dialogs/categorize";
import { QuickCapture } from "@/components/dialogs/quick-capture";
import { BulkActionBar } from "@/components/library/bulk-action-bar";
import { DeepLinkBridge } from "@/effects/deep-link-bridge";

export const Route = createRootRoute({
  component: () => (
    <Shell.Body>
      <DeepLinkBridge />
      <BulkActionBar.Root />
      <QuickCapture.Root />
      <Categorize />
      <Outlet />
    </Shell.Body>
  ),
  notFoundComponent: () => <Navigate to="/" replace />,
});
