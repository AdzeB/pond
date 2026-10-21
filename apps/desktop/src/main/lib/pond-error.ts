import type { LocalApiErrorCode } from "@pond/schema/local-api";

/** A failure with a stable code that the local API forwards to callers unchanged. */
export class PondError extends Error {
  constructor(
    readonly code: LocalApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PondError";
  }
}
