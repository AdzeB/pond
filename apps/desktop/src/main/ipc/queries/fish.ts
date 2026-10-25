import { z } from "zod";
import {
  DEFAULT_FISH_ID,
  FishIdSchema,
  FishPatchSchema,
} from "../../../shared/fish-contracts";
import type { QueryResult } from "../../../shared/query-contracts";
import { announceFishChanged, fishPresence } from "../../core/fish/presence";
import {
  createFish,
  deleteFish,
  listFish,
  markFishSeen,
  readFish,
  updateFish,
} from "../../core/fish/store";
import { query } from "./params";

const Id = z.object({ id: FishIdSchema });

export const fishQueries = {
  "fish.list": query(z.object({}), async () => {
    const { latestFishMessages } = await import("../../core/agent/persist");
    const latest = await latestFishMessages();
    return listFish().map((fish) => ({
      ...fish,
      activity: fishPresence(fish.id),
      latest: latest.get(fish.id) ?? null,
    }));
  }),
  "fish.create": query(FishPatchSchema, (patch) => {
    const fish = createFish(patch);
    announceFishChanged();
    return fish;
  }),
  "fish.update": query(
    Id.extend({ patch: FishPatchSchema }),
    ({ id, patch }) => {
      const fish = updateFish(id, patch);
      announceFishChanged();
      return fish;
    },
  ),
  "fish.delete": query(
    Id,
    async ({ id }): Promise<QueryResult<"fish.delete">> => {
      const result = deleteFish(id);
      if (!result.ok) return result;
      const { moveFishChats } = await import("../../core/agent/persist");
      await moveFishChats(id, DEFAULT_FISH_ID);
      announceFishChanged();
      return result;
    },
  ),
  "fish.markSeen": query(Id, ({ id }) => {
    markFishSeen(id);
    announceFishChanged();
    return { ok: true as const };
  }),
  "fish.run": query(Id, async ({ id }): Promise<QueryResult<"fish.run">> => {
    const fish = readFish(id);
    if (!fish) return { ok: false, error: "This fish no longer exists." };
    if (fishPresence(id))
      return { ok: false, error: `${fish.name} is already working.` };
    const { runFishRoutine } = await import("../../core/fish/routines");
    void runFishRoutine(fish, { kind: "manual" });
    return { ok: true };
  }),
};
