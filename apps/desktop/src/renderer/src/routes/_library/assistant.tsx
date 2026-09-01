import { createFileRoute } from "@tanstack/react-router";
import { AgentPane } from "@/components/library/agent-pane";
export const Route = createFileRoute("/_library/assistant")({
  component: () => <AgentPane layout="page" />,
});
