import { z } from "zod";

export const agentOperationRequest = z.object({
  operation: z.string().min(1),
  arguments: z.record(z.string(), z.json()),
  libraryId: z.string().min(1),
});

export type AgentOperationRequest = z.infer<typeof agentOperationRequest>;
