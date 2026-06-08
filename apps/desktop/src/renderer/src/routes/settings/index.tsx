import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_SECTION } from "@/features/settings/registry";

export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    throw redirect({
      to: "/settings/$section",
      params: { section: DEFAULT_SECTION.path },
      replace: true,
    });
  },
});
