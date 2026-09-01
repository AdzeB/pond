import { createFileRoute } from "@tanstack/react-router";
import { AssistantLab } from "@/components/dev/assistant";

export const Route = createFileRoute("/dev/assistant")({
  component: AssistantLabRoute,
});

function AssistantLabRoute() {
  const navigate = Route.useNavigate();
  return <AssistantLab onExit={() => void navigate({ to: "/" })} />;
}
