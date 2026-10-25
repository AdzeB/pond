import { randomUUID } from "node:crypto";
import type { Prefs } from "@pond/schema/db";
import { saves } from "@pond/schema/db";
import { and } from "drizzle-orm";
import log from "electron-log/main.js";
import {
  ASSISTANT_MODELS,
  type AssistantMessage,
  type AssistantSend,
  type AssistantSendResult,
  assistantMessages,
} from "../../../shared/assistant";
import type {
  Fish,
  FishInterval,
  FishRun,
} from "../../../shared/fish-contracts";
import type { OkSuccess } from "../../../shared/query-contracts-shared";
import { getDb } from "../../db";
import { libraryScopeClauses } from "../library-retrieval";
import { getPrefs } from "../prefs";
import { announceFishChanged } from "./presence";
import { fishScopeFilter } from "./scope";
import { listFish, recordFishRun } from "./store";

const HOUR = 60 * 60 * 1000;
export const ROUTINE_PERIOD = {
  hour: HOUR,
  day: 24 * HOUR,
  week: 7 * 24 * HOUR,
} satisfies Record<FishInterval, number>;

const MAX_NEW_SAVES = 200;

export type RoutineTrigger =
  | { kind: "manual" }
  | { kind: "schedule" }
  | { kind: "newSaves"; saveIds: string[] };

export interface RoutineDependencies {
  listFish(): Fish[];
  recordRun(id: string, run: FishRun): void;
  announce(): void;
  getPrefs(): Promise<Prefs>;
  createChat(fishId: string, title: string): Promise<{ id: string }>;
  deleteChat(chatId: string): Promise<OkSuccess>;
  send(input: AssistantSend): Promise<AssistantSendResult>;
  listMessages(chatId: string): Promise<AssistantMessage[]>;
  savesInScope(saveIds: readonly string[], fish: Fish): Promise<string[]>;
  now(): number;
}

const defaultDependencies: RoutineDependencies = {
  listFish: () => listFish(),
  recordRun: (id, run) => {
    recordFishRun(id, run);
  },
  announce: announceFishChanged,
  getPrefs,
  async createChat(fishId, title) {
    const { createChat } = await import("../agent/persist");
    return createChat(fishId, title);
  },
  async deleteChat(chatId) {
    const { deleteChat } = await import("../agent/persist");
    return deleteChat(chatId);
  },
  async send(input) {
    const { sendMessage } = await import("../agent/chat");
    return sendMessage(input);
  },
  async listMessages(chatId) {
    const { listMessages } = await import("../agent/persist");
    return assistantMessages.parse(await listMessages(chatId));
  },
  async savesInScope(saveIds, fish) {
    if (!saveIds.length) return [];
    const db = await getDb();
    const rows = await db
      .select({ id: saves.id })
      .from(saves)
      .where(
        and(
          ...libraryScopeClauses({
            saveIds: [...saveIds],
            filter: fishScopeFilter(fish.scope),
          }),
        ),
      );
    return rows.map((row) => row.id);
  },
  now: () => Date.now(),
};

const running = new Set<string>();

export function isRoutineDue(fish: Fish, now: number): boolean {
  if (fish.routine.kind !== "schedule") return false;
  const since = fish.lastRun?.at ?? fish.updatedAt;
  return now - since >= ROUTINE_PERIOD[fish.routine.every];
}

function routineTitle(trigger: RoutineTrigger): string {
  if (trigger.kind === "newSaves")
    return trigger.saveIds.length === 1
      ? "1 New Save"
      : `${trigger.saveIds.length} New Saves`;
  return trigger.kind === "schedule" ? "Routine" : "Routine Run";
}

function routineMessage(fish: Fish, trigger: RoutineTrigger): string {
  const task =
    fish.routine.kind === "off"
      ? "Look over your Saves and tell me anything worth my attention."
      : fish.routine.task;
  const lines = [
    `This is your ${trigger.kind === "manual" ? "routine, run now" : "routine"}. Nobody is watching live, so don't ask questions; propose any Library changes for review.`,
    task,
  ];
  if (trigger.kind === "newSaves")
    lines.push(
      `New Saves to look at (read them by ID): ${trigger.saveIds.join(", ")}`,
    );
  return lines.join("\n\n");
}

function providerFor(fish: Fish, prefs: Prefs) {
  const provider =
    fish.model?.provider ??
    ASSISTANT_MODELS.find((model) => model.id === prefs.agent.languageModel)
      ?.id;
  return provider ? { provider, modelId: fish.model?.modelId } : null;
}

/** Runs one fish's routine in a new chat; any changes it proposes wait for review. */
export async function runFishRoutine(
  fish: Fish,
  trigger: RoutineTrigger,
  deps: RoutineDependencies = defaultDependencies,
): Promise<FishRun | null> {
  if (running.has(fish.id)) return null;
  running.add(fish.id);
  const at = deps.now();
  const finish = (run: FishRun) => {
    deps.recordRun(fish.id, run);
    deps.announce();
    return run;
  };
  try {
    const model = providerFor(fish, await deps.getPrefs());
    if (!model)
      return finish({
        chatId: null,
        at,
        status: "failed",
        error:
          "Choose a model for this fish, or connect a provider in Settings.",
        changes: 0,
        seen: false,
      });
    const chat = await deps.createChat(fish.id, routineTitle(trigger));
    const result = await deps.send({
      chatId: chat.id,
      requestId: randomUUID(),
      content: routineMessage(fish, trigger),
      attachmentIds: [],
      fileAttachmentIds: [],
      scope: { kind: "library" },
      provider: model.provider,
      modelId: model.modelId,
      routine: {
        trigger: trigger.kind,
        saves: trigger.kind === "newSaves" ? trigger.saveIds.length : undefined,
      },
    });
    if (!result.accepted) {
      await deps.deleteChat(chat.id);
      return finish({
        chatId: null,
        at,
        status: "failed",
        error: result.error ?? "The routine couldn't start.",
        changes: 0,
        seen: false,
      });
    }
    const reply = (await deps.listMessages(chat.id)).findLast(
      (message) => message.role === "assistant",
    );
    return finish({
      chatId: chat.id,
      at,
      status: result.error ? "failed" : "done",
      error: result.error,
      changes:
        reply?.metadata?.changes?.filter(
          (change) => change.status === "pending",
        ).length ?? 0,
      seen: false,
    });
  } catch (error) {
    log.warn("[pond fish] routine failed", fish.id, error);
    return finish({
      chatId: null,
      at,
      status: "failed",
      error: error instanceof Error ? error.message : "The routine failed.",
      changes: 0,
      seen: false,
    });
  } finally {
    running.delete(fish.id);
  }
}

export async function runDueRoutines(
  deps: RoutineDependencies = defaultDependencies,
): Promise<void> {
  const now = deps.now();
  for (const fish of deps.listFish()) {
    if (isRoutineDue(fish, now))
      await runFishRoutine(fish, { kind: "schedule" }, deps);
  }
}

export async function runNewSaveRoutines(
  saveIds: readonly string[],
  deps: RoutineDependencies = defaultDependencies,
): Promise<void> {
  for (const fish of deps.listFish()) {
    if (fish.routine.kind !== "newSaves") continue;
    const inScope = await deps.savesInScope(saveIds, fish);
    if (!inScope.length) continue;
    await runFishRoutine(
      fish,
      { kind: "newSaves", saveIds: inScope.slice(0, MAX_NEW_SAVES) },
      deps,
    );
  }
}
