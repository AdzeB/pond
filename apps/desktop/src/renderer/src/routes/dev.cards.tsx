import { createFileRoute } from "@tanstack/react-router";
import { CardsPage } from "@/dev/cards/cards";

export const Route = createFileRoute("/dev/cards")({
  component: CardsPage,
});
