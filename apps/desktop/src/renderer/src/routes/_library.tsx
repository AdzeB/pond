import { createFileRoute } from "@tanstack/react-router";

import { Library } from "@/components/pages/library";

export const Route = createFileRoute("/_library")({
  component: () => <Library />,
});
