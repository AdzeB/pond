import { createFileRoute } from "@tanstack/react-router";
import { TweetCardGallery } from "@/components/tweet-card-gallery";

export const Route = createFileRoute("/tweet-preview")({
  component: TweetCardGallery,
});
