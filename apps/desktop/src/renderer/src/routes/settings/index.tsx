import { SETTINGS_SECTIONS } from "@pond/schema";
import { createFileRoute, redirect } from "@tanstack/react-router";

const DEFAULT_PATH = SETTINGS_SECTIONS[0]?.path ?? "general";

export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    throw redirect({
      to: "/settings/$section",
      params: { section: DEFAULT_PATH },
      replace: true,
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return null;
}
