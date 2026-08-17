import {
  IconArrowUpFill18 as ArrowUp,
  IconSparkle3Fill18 as Sparkle,
} from "@pond/icons/fill/18";
import { IconXmarkOutline12 as Clear } from "@pond/icons/outline/12";
import { IconPlusOutline18 as Plus } from "@pond/icons/outline/18";
import {
  Attachments,
  Chip,
  Conversation,
  Loader,
  Message,
  PromptInput,
  Shimmer,
  Suggestion,
  Tray,
} from "@pond/ui";
import styles from "./styles.module.css";

export function ChipFixture() {
  return (
    <div className={styles.row}>
      <Chip.Root
        tone="skill"
        lead={<Sparkle width={13} height={13} />}
        label="/summarize"
      />
      <Chip.Root tone="mention" lead="@" label="Linear notes" />
      <Chip.Root tone="tag" lead="#" label="design" />
      <Chip.Root
        tone="mention"
        lead="@"
        label="Removable"
        onRemove={() => undefined}
      />
    </div>
  );
}

export function ConversationFixture() {
  return (
    <Conversation.Root className={styles.conversation}>
      <Conversation.Content>
        <Message.Root from="user">
          <Message.Content>
            <Message.Response>Show me cards about ponds</Message.Response>
          </Message.Content>
        </Message.Root>
        <Message.Root from="assistant">
          <Message.Content>
            <Loader.Root>
              <Shimmer.Root>Searching</Shimmer.Root>
            </Loader.Root>
          </Message.Content>
        </Message.Root>
      </Conversation.Content>
      <Conversation.ScrollButton aria-label="Jump to latest" type="button">
        ↓
      </Conversation.ScrollButton>
    </Conversation.Root>
  );
}

export function MessageFixture() {
  return (
    <div className={styles.stack}>
      <Message.Root from="user">
        <Message.Content>
          <Message.Response>
            Find saves tagged <Chip.Root tone="tag" lead="#" label="ui" />
          </Message.Response>
        </Message.Content>
      </Message.Root>
      <Message.Root from="assistant">
        <Message.Content>
          <Message.Response>
            Here are a few matches from your library.
          </Message.Response>
          <Message.Actions>
            <Message.Action aria-label="Retry">Retry</Message.Action>
            <Message.Action aria-label="Copy">Copy</Message.Action>
          </Message.Actions>
        </Message.Content>
      </Message.Root>
    </div>
  );
}

export function SuggestionFixture() {
  return (
    <div className={styles.row}>
      <Suggestion.Root type="button">
        Broader search
        <Suggestion.Count>12</Suggestion.Count>
      </Suggestion.Root>
      <Suggestion.Root type="button">
        Without tags
        <Suggestion.Count>4</Suggestion.Count>
      </Suggestion.Root>
    </div>
  );
}

export function LoaderFixture() {
  return (
    <div className={styles.stack}>
      <Loader.Root>
        <span>Understanding…</span>
      </Loader.Root>
      <Loader.Dots />
    </div>
  );
}

export function ShimmerFixture() {
  return (
    <Loader.Root>
      <Shimmer.Root>Searching your library</Shimmer.Root>
    </Loader.Root>
  );
}

export function ThinkingFixture() {
  return (
    <Tray.Pill>
      <div className={styles["dots-pill"]}>
        <Loader.Dots />
      </div>
    </Tray.Pill>
  );
}

export function PromptInputFixture() {
  return (
    <PromptInput.Root>
      <PromptInput.Body>
        <div className={styles.placeholder}>Ask anything</div>
      </PromptInput.Body>
      <PromptInput.Toolbar>
        <PromptInput.ToolbarGroup>
          <PromptInput.Submit variant="ghost" aria-label="Add" type="button">
            <Plus />
          </PromptInput.Submit>
        </PromptInput.ToolbarGroup>
        <PromptInput.ToolbarGroup>
          <PromptInput.Submit aria-label="Ask" type="button">
            <ArrowUp />
          </PromptInput.Submit>
        </PromptInput.ToolbarGroup>
      </PromptInput.Toolbar>
    </PromptInput.Root>
  );
}

export function AttachmentsFixture() {
  return (
    <Attachments.Root>
      <Attachments.Thumb>
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Crect fill='%23888' width='28' height='28'/%3E%3C/svg%3E"
          alt=""
        />
      </Attachments.Thumb>
      <Attachments.Label>pond-reference.png</Attachments.Label>
      <Attachments.Remove aria-label="Remove image" type="button">
        <Clear />
      </Attachments.Remove>
    </Attachments.Root>
  );
}
