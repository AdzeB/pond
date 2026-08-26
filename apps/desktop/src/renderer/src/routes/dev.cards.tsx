import { createFileRoute } from "@tanstack/react-router";
import { CardsPage } from "@/components/dev/cards";

export const Route = createFileRoute("/dev/cards")({
  component: CardsPage,
});
