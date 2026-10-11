import type { RenameOptions } from "./rename-template";

export type EmptyInput = Record<string, never>;

type NoData = Record<never, never>;

export type OkSuccess<Data = NoData> = { ok: true } & Data;

export interface OkFailure {
  ok: false;
  error: string;
  reason?: never;
}

export type OkResult<Data = NoData> = OkSuccess<Data> | OkFailure;

export interface ReasonFailure<Reason extends string> {
  ok: false;
  reason: Reason;
  error?: never;
}

export type ReasonResult<Reason extends string, Data = NoData> =
  | OkSuccess<Data>
  | ReasonFailure<Reason>;

export type CancellableResult<Data = NoData> =
  | OkResult<Data>
  | ReasonFailure<"cancelled">;

export type BatchRenameInput = RenameOptions & {
  ids: string[];
  pattern: string;
};
