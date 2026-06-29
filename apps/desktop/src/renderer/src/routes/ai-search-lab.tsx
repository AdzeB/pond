import { createFileRoute } from "@tanstack/react-router";
import { AiSearchLab } from "@/components/ai-search-lab";

export const Route = createFileRoute("/ai-search-lab")({
  component: AiSearchLab,
});
