import { PrefsSchema } from "@pond/schema";
import { CANCEL_REASON } from "@pond/schema/db";
import type {
  DownloadActivity,
  DownloadTransfer,
} from "@shared/download-activity";
import type { QueryName } from "@shared/query-contracts";
import type { WireJson } from "@shared/wire";
import { z } from "zod";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { bulkUpsertSaves } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";

const idsSchema = z.object({ ids: z.array(z.string()) });
const titles = [
  "Motion studies",
  "A house in the woods",
  "Typography in motion",
];
const origin = Date.now();
const saves: Save[] = Array.from({ length: 21 }, (_, index) => ({
  id: `preview-${index}`,
  source: index === 0 ? "youtube" : index === 1 ? "instagram" : "arena",
  sourceId: `preview-${index}`,
  title: titles[index] ?? `Waiting save ${index - 2}`,
  url: `https://example.com/save/${index}`,
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "image",
  files: [],
  tags: [],
  savedAt: origin,
  createdAt: origin,
  deletedAt: null,
  status: "ingesting",
  tasks: [
    {
      op: index === 2 ? "ensure_poster" : "fetch_blobs",
      status: index < 3 ? "running" : "pending",
      attempts: 1,
      maxAttempts: 3,
      lastError: null,
      nextRunAt: 0,
      updatedAt: origin,
    },
  ],
}));
let paused = false;
let stalled = false;

export function setPreviewStalled(value: boolean) {
  stalled = value;
}
export function resetPreview() {
  for (const [index, save] of saves.entries()) {
    save.status = "ingesting";
    for (const task of save.tasks ?? [])
      task.status = index < 3 ? "running" : "pending";
  }
  paused = false;
  stalled = false;
  bulkUpsertSaves(
    saves.map((save) => ({
      ...save,
      tasks: save.tasks?.map((task) => ({ ...task })),
    })),
  );
  libraryChrome.inspectDownload("preview-0");
}

function activities(): DownloadActivity[] {
  const now = Date.now();
  return saves.slice(0, 3).flatMap((save, index) => {
    if (save.status !== "ingesting") return [];
    const phase =
      index === 0 ? "receiving" : index === 1 ? "requesting" : "processing";
    const transfers: DownloadTransfer[] = [];
    if (index !== 2) {
      const transfer: DownloadTransfer = {
        fileIndex: 2,
        fileCount: 3,
        state: index === 0 ? "receiving" : "requesting",
        startedAt: now - (stalled ? 21_000 : 4_000),
        updatedAt: now - (stalled ? 18_000 : 0),
        request: { method: "GET", host: "media.example.com" },
      };
      if (index === 0) {
        transfer.request = {
          method: "GET",
          host: "media.example.com",
          status: 200,
          contentType: "video/mp4",
          responseMs: 340,
          firstByteMs: 365,
        };
        transfer.lastByteAt = now - (stalled ? 18_000 : 0);
        transfer.receivedBytes = 38_400_000;
        transfer.totalBytes = 120_000_000;
        transfer.bytesPerSecond = 4_200_000;
        transfer.etaSeconds = 20;
      }
      transfers.push(transfer);
    }
    return [
      {
        taskId: `task-${index}`,
        saveId: save.id,
        op: index === 2 ? "ensure_poster" : "fetch_blobs",
        state: "running",
        startedAt: origin,
        updatedAt: now,
        phase,
        phaseStartedAt:
          now - (index === 0 ? 9_000 : index === 1 ? 4_000 : 2_000),
        transfers,
        timeline: [
          { phase: "starting", at: now - 11_000 },
          { phase: "requesting", at: now - 10_000 },
          { phase, at: now - 9_000 },
        ],
      },
    ];
  });
}

export function installDownloadPreview() {
  if (window.pond)
    throw new Error(
      "Open the download preview in a browser, outside the desktop app.",
    );
  const prefs = PrefsSchema.parse({ preferences: { soundsEnabled: false } });
  Object.assign(window, {
    pond: {
      async query(name: QueryName, params?: WireJson) {
        switch (name) {
          case "settings.getPrefs":
            return prefs;
          case "downloads.activity":
            return activities();
          case "downloads.live":
            return saves
              .filter((save) => save.status === "ingesting")
              .map((save) => save.id);
          case "pipeline.inflight":
            return saves
              .slice(0, 3)
              .filter((save) => save.status === "ingesting")
              .map((save) => save.id);
          case "pipeline.status":
            return { paused };
          case "saves.getMany":
            return saves.filter((save) =>
              idsSchema.parse(params).ids.includes(save.id),
            );
          case "downloads.history":
            return { rows: [], nextCursor: null };
          case "saves.retryFailed": {
            for (const id of idsSchema.parse(params).ids) {
              const save = saves.find((save) => save.id === id);
              if (save) {
                save.status = "ingesting";
                for (const task of save.tasks ?? []) {
                  task.status = "pending";
                  task.lastError = null;
                }
              }
            }
            bulkUpsertSaves(saves.map((save) => ({ ...save })));
            return { ok: true, requeued: 1 };
          }
          default:
            throw new Error(`No download preview fixture for ${name}`);
        }
      },
      async pipelinePause(value: boolean) {
        paused = value;
        return { ok: true, paused };
      },
      async pipelineCancelSave(id: string) {
        const save = saves.find((save) => save.id === id);
        if (save) {
          save.status = "failed";
          for (const task of save.tasks ?? []) {
            task.status = "failed";
            task.lastError = CANCEL_REASON;
          }
          bulkUpsertSaves([{ ...save }]);
        }
        return { ok: true, cancelled: true };
      },
      async pipelineCancelAll() {
        for (const save of saves) await window.pond.pipelineCancelSave(save.id);
        return { ok: true, cancelled: saves.length };
      },
    },
  });
  resetPreview();
}
