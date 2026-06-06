import { Shell } from "@pond/ui";
import {
  createRootRoute,
  Navigate,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { BulkActionBar } from "@/components/library/bulk-action-bar";
import { Categorize } from "@/components/library/categorize";
import { QuickCapture } from "@/components/library/quick-capture";
import { DeepLinkBridge } from "@/effects/deep-link-bridge";
import { wasOnboardedLocally } from "@/lib/utils/onboarded";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const onboarded = window.__pondShell?.onboarded;
    if (
      onboarded === false &&
      !wasOnboardedLocally() &&
      location.pathname !== "/welcome"
    ) {
      throw redirect({ to: "/welcome" });
    }
  },
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
