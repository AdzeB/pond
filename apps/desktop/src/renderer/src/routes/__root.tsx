import {
  createRootRoute,
  Navigate,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AppRoot } from "@/components/shell/app-root";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const onboarded = window.__pondShell?.onboarded;
    if (onboarded === false && location.pathname !== "/welcome") {
      throw redirect({ to: "/welcome" });
    }
  },
  component: () => (
    <AppRoot>
      <Outlet />
    </AppRoot>
  ),
  notFoundComponent: () => <Navigate to="/" replace />,
});
