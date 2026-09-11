import {
  IconBookmarkOutline18,
  IconFileOutline18,
  IconImageOutline18,
  IconLink2Outline18,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";

type AgentPrompt<Id extends string> = {
  id: Id;
  title: string;
  detail: string;
  icon: IconComponent;
  prompt: string;
};

export const ASSISTANT_ACTIONS: readonly [
  AgentPrompt<"summarize">,
  AgentPrompt<"connect">,
  AgentPrompt<"organize">,
  AgentPrompt<"describe">,
] = [
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
    icon: IconBookmarkOutline18,
    prompt:
      "Suggest better titles, tags, and folders for these Saves. Let me review the changes before applying them.",
  },
  {
    id: "describe",
    title: "Describe Images",
    detail: "Title and tag from what you see",
    icon: IconImageOutline18,
    prompt:
      "Look at these Saves and propose titles and tags from the images. Let me review before applying changes.",
  },
];

export const AGENT_STARTERS: readonly [
  AgentPrompt<"find">,
  AgentPrompt<"connect">,
  AgentPrompt<"organize">,
] = [
  {
    id: "find",
    title: "Find a Reference",
    detail: "Rediscover something you saved",
    icon: IconFileOutline18,
    prompt: "Find three Saves about ",
  },
  {
    id: "connect",
    title: "Connect Ideas",
    detail: "Compare themes across your Saves",
    icon: IconLink2Outline18,
    prompt: "Compare my recent Saves and explain their shared ideas.",
  },
  {
    id: "organize",
    title: "Organize Saves",
    detail: "Review titles, tags, and folders",
    icon: IconBookmarkOutline18,
    prompt:
      "Find Saves missing tags and suggest how to organize them. Let me review each change.",
  },
];

export type AssistantAction = (typeof ASSISTANT_ACTIONS)[number]["id"];
export type AgentStarter = (typeof AGENT_STARTERS)[number]["id"];
