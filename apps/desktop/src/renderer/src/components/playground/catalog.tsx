import type { ComponentType } from "react";
import {
  AttachmentsFixture,
  ChipFixture,
  ConversationFixture,
  LoaderFixture,
  MessageFixture,
  PromptInputFixture,
  ShimmerFixture,
  SuggestionFixture,
} from "./fixtures";

export type PlaygroundEntry = {
  id: string;
  name: string;
  blurb: string;
  Fixture: ComponentType;
};

export const PLAYGROUND_CATALOG: PlaygroundEntry[] = [
  {
    id: "conversation",
    name: "Conversation",
    blurb: "Scrollable transcript shell with empty and jump-to-latest.",
    Fixture: ConversationFixture,
  },
  {
    id: "message",
    name: "Message",
    blurb: "User and assistant message frames with actions.",
    Fixture: MessageFixture,
  },
  {
    id: "suggestion",
    name: "Suggestion",
    blurb: "Relaxation / follow-up chips under an answer.",
    Fixture: SuggestionFixture,
  },
  {
    id: "loader",
    name: "Loader",
    blurb: "Stage status line while AI search is working.",
    Fixture: LoaderFixture,
  },
  {
    id: "shimmer",
    name: "Shimmer",
    blurb: "Sweeping text treatment for thinking labels.",
    Fixture: ShimmerFixture,
  },
  {
    id: "prompt-input",
    name: "Prompt Input",
    blurb: "Composer shell, toolbar, and submit.",
    Fixture: PromptInputFixture,
  },
  {
    id: "attachments",
    name: "Attachments",
    blurb: "Pending image row above the composer.",
    Fixture: AttachmentsFixture,
  },
  {
    id: "chip",
    name: "Chip",
    blurb: "Skill, mention, and tag pills.",
    Fixture: ChipFixture,
  },
];
