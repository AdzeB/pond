import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ComponentsPage } from "@/dev/components/components";

export const Route = createFileRoute("/dev/components")({
  validateSearch: z.object({
    component: z.string().optional().catch(undefined),
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
