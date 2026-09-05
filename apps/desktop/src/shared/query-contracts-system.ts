import type {
  AgentChat,
  AgentMessage,
  ConnectedAccount,
  ImageDownloadSettings,
  MediaType,
  Prefs,
  Source,
  VideoDownloadSettings,
  WatchedAccount,
} from "@pond/schema/db";
import type { SyncRunEvent } from "@pond/schema/events";
import type { RawQueryPlan } from "@pond/schema/query-plan";
import type {
  AssistantChange,
  AssistantProvider,
  AssistantSendResult,
} from "./assistant";
import type { ProviderModel } from "./provider-models";

interface OkResult {
  ok: boolean;
  reason?: string;
  error?: string;
}
interface PathResult extends OkResult {
  path?: string;
}
interface RetrievalSave {
  id: string;
  title: string | null;
  url: string;
  author: string | null;
  source: Source;
  notes: string | null;
  description: string | null;
}
interface RetrievalHit extends RetrievalSave {
  mediaType: MediaType | null;
  savedAt: Date;
  score: number;
  channels: ("fts" | "text" | "visual" | "recent")[];
}
interface SyncRun {
  id: number;
  ts: number;
  source: Source;
  accountId: string | null;
  trigger: string;
  outcome: SyncRunEvent["outcome"];
  durationMs: number;
  harvest: SyncRunEvent["harvest"];
  enqueue: SyncRunEvent["enqueue"];
  error: SyncRunEvent["error"];
  watchdogTripped: boolean;
}
interface WatchTarget {
  kind: WatchedAccount["kind"];
  handle: string;
  display: string;
}
interface AttachmentIdentity {
  id: string;
  title: string | null;
  url: string;
  author: string | null;
  source: Source;
}
type Attachment = AttachmentIdentity &
  (
    | {
        field:
          | "description"
          | "notes"
          | "caption"
          | "ocr"
          | "transcript"
          | "comments";
        text: string;
        offset: number;
        length: number;
        total: number;
      }
    | {
        description: string;
        descriptionTokens: number;
        notes: string;
        notesTokens: number;
        caption: string;
        captionTokens: number;
        ocr: string;
        ocrTokens: number;
        transcript: string;
        transcriptTokens: number;
        comments: string[];
        rating: number | null;
        tags: string[];
        folderIds: string[];
        mediaType: MediaType | null;
        width: number | null;
        height: number | null;
      }
  );

export interface SystemQueryResults {
  "accounts.list": {
    accounts: (ConnectedAccount & { connected: boolean; syncing: boolean })[];
  };
  "accounts.setHandle": OkResult & { account: ConnectedAccount | null };
  "accounts.setLabel": OkResult & { account: ConnectedAccount | null };
  "accounts.disconnect": OkResult;
  "watches.list": { watches: (WatchedAccount & { syncing: boolean })[] };
  "watches.resolve": { ok: false } | { ok: true; target: WatchTarget };
  "watches.add":
    | { ok: false; reason: string }
    | { ok: true; watch: WatchedAccount };
  "watches.setLabel": OkResult & { watch: WatchedAccount | null };
  "watches.remove": OkResult;
  "agent.keys": {
    provider: AssistantProvider;
    hasKey: boolean;
    masked: string | null;
    enabled: boolean;
  }[];
  "agent.removeKey": OkResult;
  "agent.setKeyEnabled": OkResult;
  "agent.verifyKey": OkResult;
  "agent.listModels": OkResult & { models: ProviderModel[] };
  "agent.listAvailableModels": {
    providers: (OkResult & {
      provider: AssistantProvider;
      models: ProviderModel[];
    })[];
  };
  "agent.chats": AgentChat[];
  "agent.messages": AgentMessage[];
  "agent.newChat": AgentChat;
  "agent.deleteChat": OkResult;
  "agent.send": AssistantSendResult;
  "agent.stop": OkResult;
  "agent.searchSaves": { saves: RetrievalSave[] };
  "agent.attachments": Attachment[];
  "agent.review": { changes: AssistantChange[] };
  "agent.mcpSnippet": {
    command: string;
    args: string[];
    json: string;
    app: string;
  };
  "ai.compilePlan": { plan: RawQueryPlan | null };
  "saves.retrieve": { hits: RetrievalHit[]; saves: RetrievalSave[] };
  "sync.history": { runs: SyncRun[] };
  "sync.recent": { runs: SyncRun[] };
  "sync.runs": { runs: SyncRun[] };
  "sync.stats": {
    itemsSynced: number;
    itemsSyncedPrev: number;
    newToday: number;
    runsToday: number;
    runs: number;
    successRate: number;
    successRatePrev: number;
    avgRunMs: number;
    avgRunMsPrev: number;
    failed: number;
    recovered: number;
    lastRunAt: number | null;
  };
  "settings.get": {
    id: string;
    videoDownload: VideoDownloadSettings;
    imageDownload: ImageDownloadSettings;
    libraryRoot: string | null;
    updatedAt: Date;
  };
  "settings.setVideoDownload": OkResult & {
    videoDownload: VideoDownloadSettings;
  };
  "settings.setImageDownload": OkResult & {
    imageDownload: ImageDownloadSettings;
  };
  "settings.ingestToken": { token: string | null };
  "settings.rotateIngestToken": { token: string };
  "settings.getOnboarded": { onboarded: boolean };
  "settings.setOnboarded": OkResult;
  "autoImport.status": Prefs["autoImport"] & {
    history: {
      at: number;
      name: string;
      mode: "copy" | "move";
      ok: boolean;
      id?: string;
    }[];
  };
  "autoImport.set": OkResult;
  "autoImport.pickFolder": { ok: boolean; path: string | null };
  "library.info": { path: string; name: string };
  "library.rescan": { updated: number; total: number };
  "library.openInFinder": OkResult;
  "library.verifyIntegrity": OkResult & {
    orphans?: string[];
    missing?: string[];
    errors?: Record<string, string>;
    totalIndexed?: number;
    totalOnDisk?: number;
  };
  "library.createAt": PathResult;
  "library.pickExisting": PathResult;
  "library.pickFolder": PathResult;
  "library.switchTo": PathResult & { mode?: "adopt" | "copy" };
  "library.move": PathResult;
  "library.backupTo": PathResult & { copied?: number };
  "reset.preferences": OkResult;
  "reset.clearVideoCache": OkResult & { removed: number };
  "reset.clearThumbnails": OkResult & { removed: number };
  "reset.factory": OkResult;
  "storage.snapshot": {
    pondBytes: number;
    breakdown: {
      items: number;
      videoCache: number;
      thumbs: number;
      meta: number;
      db: number;
      other: number;
    };
    deviceTotalBytes: number;
    deviceFreeBytes: number;
    deviceUsedByOthersBytes: number;
    libraryRoot: string;
    computedAt: string;
  };
  "storage.applyGuardPrefs": OkResult;
  "storage.guardState": {
    state: "ok" | "warn" | "exceeded";
    pondBytes: number;
    capBytes: number | null;
    warnBytes: number | null;
    action: "warn" | "pauseSync" | "pauseVideo";
    appliedAt: string;
  };
  "api.restart": OkResult & { port?: number };
  "updates.applyPrefs": OkResult;
  "updates.checkNow": OkResult & { version?: string };
  "quickCapture.applyPrefs": OkResult;
  "window.applyPrefs": OkResult;
}
