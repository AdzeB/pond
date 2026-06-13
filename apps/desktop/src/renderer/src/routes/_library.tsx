import { createFileRoute } from "@tanstack/react-router";

import { Library } from "@/components/library-page";

export const Route = createFileRoute("/_library")({
  component: () => <Library />,
});
