import { createFileRoute } from "@tanstack/react-router";

import { Library } from "@/features/library/components/page/page";

export const Route = createFileRoute("/_library")({
  component: () => <Library />,
});
