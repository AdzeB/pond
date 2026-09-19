import { createFileRoute } from "@tanstack/react-router";

import { Library } from "@/features/library/components/page";

export const Route = createFileRoute("/_library")({
  component: () => <Library />,
});
