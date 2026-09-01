import { createFileRoute } from "@tanstack/react-router";
import { DownloadsLab } from "@/components/dev/downloads";

export const Route = createFileRoute("/dev/downloads")({
  component: DownloadsLabRoute,
});

function DownloadsLabRoute() {
  const navigate = Route.useNavigate();
  return <DownloadsLab onExit={() => void navigate({ to: "/" })} />;
}
