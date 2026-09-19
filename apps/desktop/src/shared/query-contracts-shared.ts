export type EmptyInput = Record<string, never>;

export interface OkResult {
  ok: boolean;
  error?: string;
  reason?: string;
}
