export type AgentStreamEvent =
  | { type: "data"; data: number[] }
  | { type: "end" }
  | { type: "error"; error: string };
