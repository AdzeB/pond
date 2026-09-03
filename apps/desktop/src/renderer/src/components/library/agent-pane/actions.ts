import {
  IconFileOutline18,
  IconImageOutline18,
  IconLink2Outline18,
  IconTagsOutline18,
} from "@pond/icons/outline/18";

export const ASSISTANT_ACTIONS = [
  {
    id: "summarize",
    title: "Summarize",
    detail: "Pull out the main ideas",
    icon: IconFileOutline18,
    prompt: "Summarize the main ideas in these Saves.",
  },
  {
    id: "connect",
    title: "Connect Ideas",
    detail: "Find shared themes",
    icon: IconLink2Outline18,
    prompt: "Find shared themes and connections between these Saves.",
  },
  {
    id: "organize",
    title: "Organize Saves",
    detail: "Review titles, tags, and folders",
    icon: IconTagsOutline18,
    prompt:
      "Suggest better titles, tags, and folders for these Saves. Let me review the changes before applying them.",
  },
  {
    id: "describe",
    title: "Describe Images",
    detail: "Title and tag from what you see",
    icon: IconImageOutline18,
    prompt:
      "Look at these Saves and propose titles and tags from the images. Use proposeChanges so I can review.",
  },
] as const;

export type AssistantAction = (typeof ASSISTANT_ACTIONS)[number]["id"];
