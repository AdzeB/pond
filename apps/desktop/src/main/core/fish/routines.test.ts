import { DEFAULT_PREFS } from "@pond/schema/db";
import { expect, it } from "vitest";
import type {
  AssistantMessage,
  AssistantSend,
  AssistantSendResult,
} from "../../../shared/assistant";
import type { Fish, FishRun } from "../../../shared/fish-contracts";
import {
  isRoutineDue,
  ROUTINE_PERIOD,
  type RoutineDependencies,
  runDueRoutines,
  runFishRoutine,
  runNewSaveRoutines,
} from "./routines";

const curator: Fish = {
  id: "curator",
  name: "Curator",
  color: "teal",
  species: "angelfish",
  instructions: "",
  scope: { folderIds: [], tags: ["poster"] },
  model: { provider: "openai", modelId: "gpt-visible" },
  routine: { kind: "schedule", every: "day", task: "Write a digest." },
  lastRun: null,
  createdAt: 0,
  updatedAt: 0,
};

function pond(
  school: Fish[],
  reply: (input: AssistantSend) => AssistantSendResult = (input) => ({
    chatId: input.chatId,
    accepted: true,
  }),
) {
  const runs: Array<[string, FishRun]> = [];
  const sent: AssistantSend[] = [];
  const chats: string[] = [];
  const deleted: string[] = [];
  let announcements = 0;
  const messages: AssistantMessage[] = [
    {
      id: "reply",
      chatId: "chat-1",
      role: "assistant",
      content: "Done",
      metadata: {
        changes: [
          {
            id: "a",
            saveId: "s1",
            field: "tags",
            title: "Poster",
            reason: "Matches the poster tag",
            before: [],
            after: ["poster"],
            status: "pending",
          },
        ],
      },
    },
  ];
  const deps: RoutineDependencies = {
    listFish: () => school,
    recordRun: (id, run) => runs.push([id, run]),
    announce: () => {
      announcements += 1;
    },
    getPrefs: async () => ({
      ...DEFAULT_PREFS,
      agent: { ...DEFAULT_PREFS.agent, languageModel: "anthropic" },
    }),
    createChat: async (fishId, title) => {
      chats.push(`${fishId}:${title}`);
      return { id: `chat-${chats.length}` };
    },
    deleteChat: async (chatId) => {
      deleted.push(chatId);
      return { ok: true };
    },
    send: async (input) => {
      sent.push(input);
      return reply(input);
    },
    listMessages: async () => messages,
    savesInScope: async (ids) => ids.filter((id) => id.startsWith("poster")),
    now: () => ROUTINE_PERIOD.day,
  };
  return {
    deps,
    runs,
    sent,
    chats,
    deleted,
    announcements: () => announcements,
  };
}

it("runs a routine in its own chat with the fish's model and counts pending changes", async () => {
  const fake = pond([curator]);
  const run = await runFishRoutine(curator, { kind: "schedule" }, fake.deps);

  expect(fake.chats).toEqual(["curator:Routine"]);
  expect(fake.sent[0]).toMatchObject({
    chatId: "chat-1",
    provider: "openai",
    modelId: "gpt-visible",
    scope: { kind: "library" },
    routine: { trigger: "schedule" },
  });
  expect(fake.sent[0]?.content).toContain("Write a digest.");
  expect(run).toEqual({
    chatId: "chat-1",
    at: ROUTINE_PERIOD.day,
    status: "done",
    changes: 1,
    seen: false,
  });
  expect(fake.runs).toEqual([["curator", run]]);
  expect(fake.announcements()).toBe(1);
});

it("falls back to the chosen Assistant model when the fish has none", async () => {
  const fake = pond([]);
  await runFishRoutine(
    { ...curator, model: null },
    { kind: "manual" },
    fake.deps,
  );
  expect(fake.sent[0]).toMatchObject({ provider: "anthropic" });
  expect(fake.sent[0]?.modelId).toBeUndefined();
});

it("removes the empty chat and reports why when the reply never starts", async () => {
  const fake = pond([curator], (input) => ({
    chatId: input.chatId,
    accepted: false,
    error: "Add an enabled provider key in Settings.",
  }));
  const run = await runFishRoutine(curator, { kind: "schedule" }, fake.deps);
  expect(fake.deleted).toEqual(["chat-1"]);
  expect(run).toMatchObject({
    chatId: null,
    status: "failed",
    error: "Add an enabled provider key in Settings.",
  });
});

it("runs scheduled routines once their interval has passed since the last run", async () => {
  expect(isRoutineDue(curator, ROUTINE_PERIOD.day - 1)).toBe(false);
  expect(isRoutineDue(curator, ROUTINE_PERIOD.day)).toBe(true);
  expect(
    isRoutineDue(
      {
        ...curator,
        lastRun: {
          chatId: "c",
          at: ROUTINE_PERIOD.day - 10,
          status: "done",
          changes: 0,
          seen: true,
        },
      },
      ROUTINE_PERIOD.day,
    ),
  ).toBe(false);
  expect(
    isRoutineDue({ ...curator, routine: { kind: "off" } }, ROUTINE_PERIOD.week),
  ).toBe(false);

  const fake = pond([
    curator,
    { ...curator, id: "idle", routine: { kind: "off" } },
  ]);
  await runDueRoutines(fake.deps);
  expect(fake.chats).toEqual(["curator:Routine"]);
});

it("hands new Saves only to fish whose scope includes them", async () => {
  const librarian: Fish = {
    ...curator,
    id: "librarian",
    routine: { kind: "newSaves", task: "Tag new posters." },
  };
  const fake = pond([curator, librarian]);
  await runNewSaveRoutines(["poster-1", "film-1", "poster-2"], fake.deps);

  expect(fake.chats).toEqual(["librarian:2 New Saves"]);
  expect(fake.sent[0]?.routine).toEqual({ trigger: "newSaves", saves: 2 });
  expect(fake.sent[0]?.content).toContain("poster-1, poster-2");
  expect(fake.sent[0]?.content).not.toContain("film-1");

  const none = pond([librarian]);
  await runNewSaveRoutines(["film-1"], none.deps);
  expect(none.chats).toEqual([]);
});
