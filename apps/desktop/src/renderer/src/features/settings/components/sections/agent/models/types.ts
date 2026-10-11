import type { AssistantProvider } from "@shared/assistant";
import type { ProviderModel } from "@shared/provider-models";
import type { AgentPrefs } from "../types";

export type VisibleModelIds = NonNullable<AgentPrefs["visibleModelIds"]>;

export type CatalogModel = ProviderModel & {
  provider: AssistantProvider;
  providerName: string;
};
