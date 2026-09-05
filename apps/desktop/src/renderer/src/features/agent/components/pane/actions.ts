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

export const AGENT_STARTERS = [
  {
    id: "overview",
    title: "Library Overview",
    prompt:
      "Give me an overview of this library. Use libraryOverview, then say what is messy or untagged and what I should organize first.",
  },
  {
    id: "tag",
    title: "Tag Untagged",
    prompt:
      "Find Saves missing tags. Read a sample, then propose tags with proposeChanges so I can review.",
  },
  {
    id: "duplicates",
    title: "Merge Duplicates",
    prompt:
      "Find duplicate Saves and propose merges with proposeChanges so I can review.",
  },
  {
    id: "title",
    title: "Title Images",
    prompt:
      "Find recent images missing titles or tags. Look at them and propose titles and tags with proposeChanges so I can review.",
  },
] as const;

export type AssistantAction = (typeof ASSISTANT_ACTIONS)[number]["id"];
export type AgentStarter = (typeof AGENT_STARTERS)[number]["id"];
