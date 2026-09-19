import { createFileRoute } from "@tanstack/react-router";
import { AgentPane } from "@/features/agent/components/pane";

export const Route = createFileRoute("/_library/assistant")({
  component: AgentPage,
});

function AgentPage() {
  return <AgentPane layout="page" />;
}
