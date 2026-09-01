import { createFileRoute } from "@tanstack/react-router";
import { ComponentsPage } from "@/components/dev/components";

export const Route = createFileRoute("/dev/components")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { component?: string } => ({
    component:
      typeof search.component === "string" ? search.component : undefined,
  }),
  component: ComponentGalleryRoute,
});

function ComponentGalleryRoute() {
  const { component } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ComponentsPage
      component={component}
      onSelect={(component) =>
        void navigate({ search: { component }, replace: true })
      }
      onExit={() => void navigate({ to: "/" })}
    />
  );
}
