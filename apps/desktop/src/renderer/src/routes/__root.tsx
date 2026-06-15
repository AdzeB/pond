import { createRootRoute, Outlet } from "@tanstack/react-router";
import { LiquidGlassFilters } from "@/components/liquid-glass";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <LiquidGlassFilters />
      <Outlet />
    </>
  );
}
