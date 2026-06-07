import type {
  NewSave,
  NewSavedView,
  NewTag,
  NewTagGroup,
  NewTagGroupMember,
  Save,
  SavedView,
  SyncAction,
  Tag,
  TagGroup,
  TagGroupMember,
} from "./db";

export type ActorKind = "user" | "system";

export interface TxMeta {
  actor?: ActorKind;
  actorReason?: string;
  batchId?: string;
  silent?: boolean;
}

export interface TxSaveFile {
  filename: string;
  bytes: Uint8Array;
  mimeType?: string;
}

export type Transaction =
  | {
      kind: "create";
      model: "save";
      id: string;
      data: NewSave;
      files?: TxSaveFile[];
      meta?: TxMeta;
    }
  | {
      kind: "update";
      model: "save";
      id: string;
      patch: Partial<NewSave>;
      before: Partial<Save>;
      files?: TxSaveFile[];
      meta?: TxMeta;
    }
  | {
      kind: "delete";
      model: "save";
      id: string;
      before: Save;
      meta?: TxMeta;
    }
  | {
      kind: "trash";
      model: "save";
      id: string;
      meta?: TxMeta;
    }
  | {
      kind: "untrash";
      model: "save";
      id: string;
      meta?: TxMeta;
    }
  | {
      kind: "purge";
      model: "save";
      id: string;
      before: Save;
      meta?: TxMeta;
    }
  | {
      kind: "create";
      model: "tag";
      id: string;
      data: NewTag;
      meta?: TxMeta;
    }
  | {
      kind: "update";
      model: "tag";
      id: string;
      patch: Partial<NewTag>;
      before: Partial<Tag>;
      meta?: TxMeta;
    }
  | {
      kind: "delete";
      model: "tag";
      id: string;
      before: Tag;
      meta?: TxMeta;
    }
  | {
      kind: "create";
      model: "tag_group";
      id: string;
      data: NewTagGroup;
      meta?: TxMeta;
    }
  | {
      kind: "update";
      model: "tag_group";
      id: string;
      patch: Partial<NewTagGroup>;
      before: Partial<TagGroup>;
      meta?: TxMeta;
    }
  | {
      kind: "delete";
      model: "tag_group";
      id: string;
      before: TagGroup;
      meta?: TxMeta;
    }
  | {
      kind: "create";
      model: "tag_group_member";
      id: string;
      data: NewTagGroupMember;
      meta?: TxMeta;
    }
  | {
      kind: "delete";
      model: "tag_group_member";
      id: string;
      before: TagGroupMember;
      meta?: TxMeta;
    }
  | {
      kind: "create";
      model: "saved_view";
      id: string;
      data: NewSavedView;
      meta?: TxMeta;
    }
  | {
      kind: "update";
      model: "saved_view";
      id: string;
      patch: Partial<NewSavedView>;
      before: Partial<SavedView>;
      meta?: TxMeta;
    }
  | {
      kind: "delete";
      model: "saved_view";
      id: string;
      before: SavedView;
      meta?: TxMeta;
    };

export type TransactionKind = Transaction["kind"];
export type TransactionModel = Transaction["model"];

export interface TransactionResult {
  tx: Transaction;
  action: SyncAction;
}

export function inverse(tx: Transaction): Transaction {
  switch (tx.kind) {
    case "create":
      switch (tx.model) {
        case "save":
          return {
            kind: "delete",
            model: "save",
            id: tx.id,
            before: tx.data as Save,
            meta: tx.meta,
          };
        case "tag":
          return {
            kind: "delete",
            model: "tag",
            id: tx.id,
            before: tx.data as Tag,
            meta: tx.meta,
          };
        case "tag_group":
          return {
            kind: "delete",
            model: "tag_group",
            id: tx.id,
            before: tx.data as TagGroup,
            meta: tx.meta,
          };
        case "tag_group_member":
          return {
            kind: "delete",
            model: "tag_group_member",
            id: tx.id,
            before: tx.data as TagGroupMember,
            meta: tx.meta,
          };
        case "saved_view":
          return {
            kind: "delete",
            model: "saved_view",
            id: tx.id,
            before: tx.data as SavedView,
            meta: tx.meta,
          };
      }
      break;
    case "update":
      switch (tx.model) {
        case "save":
          return {
            kind: "update",
            model: "save",
            id: tx.id,
            patch: tx.before,
            before: tx.patch as Partial<Save>,
            meta: tx.meta,
          };
        case "tag":
          return {
            kind: "update",
            model: "tag",
            id: tx.id,
            patch: tx.before,
            before: tx.patch as Partial<Tag>,
            meta: tx.meta,
          };
        case "tag_group":
          return {
            kind: "update",
            model: "tag_group",
            id: tx.id,
            patch: tx.before,
            before: tx.patch as Partial<TagGroup>,
            meta: tx.meta,
          };
        case "saved_view":
          return {
            kind: "update",
            model: "saved_view",
            id: tx.id,
            patch: tx.before,
            before: tx.patch as Partial<SavedView>,
            meta: tx.meta,
          };
      }
      break;
    case "delete":
      switch (tx.model) {
        case "save":
          return {
            kind: "create",
            model: "save",
            id: tx.id,
            data: tx.before as NewSave,
            meta: tx.meta,
          };
        case "tag":
          return {
            kind: "create",
            model: "tag",
            id: tx.id,
            data: tx.before as NewTag,
            meta: tx.meta,
          };
        case "tag_group":
          return {
            kind: "create",
            model: "tag_group",
            id: tx.id,
            data: tx.before as NewTagGroup,
            meta: tx.meta,
          };
        case "tag_group_member":
          return {
            kind: "create",
            model: "tag_group_member",
            id: tx.id,
            data: tx.before as NewTagGroupMember,
            meta: tx.meta,
          };
        case "saved_view":
          return {
            kind: "create",
            model: "saved_view",
            id: tx.id,
            data: tx.before as NewSavedView,
            meta: tx.meta,
          };
      }
      break;
    case "trash":
      return { kind: "untrash", model: "save", id: tx.id, meta: tx.meta };
    case "untrash":
      return { kind: "trash", model: "save", id: tx.id, meta: tx.meta };
    case "purge":
      return {
        kind: "create",
        model: "save",
        id: tx.id,
        data: tx.before as NewSave,
        meta: tx.meta,
      };
  }
  throw new Error("tx.inverse: unhandled transaction shape");
}
