import type { ApiErrorCode } from "@pond/schema/api";

/** A failure with a stable code that the local API forwards to callers unchanged. */
export class PondError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PondError";
  }
}
