import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_library/settings/models/$provider")({
  beforeLoad: () => {
    throw redirect({ href: "/settings/agent-models" });
  },
  component: () => null,
});
