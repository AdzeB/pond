import { createFileRoute } from "@tanstack/react-router";
import { AgentPane } from "@/features/agent/components/pane/pane";
export const Route = createFileRoute("/_library/assistant")({
  component: () => <AgentPane layout="page" />,
});
