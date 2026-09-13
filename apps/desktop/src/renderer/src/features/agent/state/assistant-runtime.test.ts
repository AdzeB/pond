import type { AssistantMessage } from "@shared/assistant";
import { expect, it } from "vitest";
import { fromThreadMessage, toThreadMessage } from "./assistant-runtime";

it("keeps the streaming presentation identity while domain actions receive the saved message ID and latest metadata", () => {
  const saved: AssistantMessage = {
    id: "database-reply",
    chatId: "chat",
    role: "assistant",
    content: "I found a Save and prepared a tag change.",
    metadata: {
      stopped: true,
      sources: [
        {
          id: "save",
          title: "Film",
          source: "arena",
          url: "https://example.com/film",
        },
      ],
      changes: [
        {
          id: "change",
          saveId: "save",
          title: "Film",
          reason: "Group this reference",
          status: "pending",
          field: "tags",
          before: [],
          after: ["Film"],
        },
      ],
    },
  };
  const displayed = toThreadMessage(saved, "request:assistant");
  expect(displayed.id).toBe("request:assistant");
  expect(fromThreadMessage(displayed, "chat")).toEqual(saved);
  const applied: AssistantMessage = {
    ...saved,
    metadata: {
      ...saved.metadata,
      changes: saved.metadata?.changes?.map((change) => ({
        ...change,
        status: "applied",
      })),
    },
  };
  const updated = toThreadMessage(applied, displayed.id);
  expect(updated.id).toBe(displayed.id);
  const actionTarget = fromThreadMessage(updated, "chat");
  expect(actionTarget.id).toBe("database-reply");
  expect(actionTarget.metadata?.changes?.[0]?.status).toBe("applied");
  expect(actionTarget.metadata?.sources).toEqual(saved.metadata?.sources);
});

it("uses saved IDs for history and the stream ID before a persisted ID exists", () => {
  const saved: AssistantMessage = {
    id: "saved",
    chatId: "chat",
    role: "assistant",
    content: "Historical answer",
    metadata: null,
  };
  expect(toThreadMessage(saved).id).toBe("saved");
  expect(fromThreadMessage(toThreadMessage(saved), "chat")).toEqual(saved);
  const pending = fromThreadMessage(
    {
      id: "request:assistant",
      role: "assistant",
      content: [
        { type: "text", text: "A " },
        { type: "text", text: "partial answer" },
      ],
    },
    "chat",
  );
  expect(pending).toEqual({
    id: "request:assistant",
    chatId: "chat",
    role: "assistant",
    content: "A partial answer",
    metadata: null,
  });
});
