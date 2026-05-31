import { createFileRoute } from "@tanstack/react-router";
import { DuplicatesView } from "@/components/library/duplicates";
import { Shell } from "@/components/shell";

function DuplicatesPage() {
  return (
    <Shell.Main>
      <DuplicatesView />
    </Shell.Main>
  );
}

export const Route = createFileRoute("/_library/duplicates")({
  component: DuplicatesPage,
});
