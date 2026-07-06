import { type AiProviderId, modelSupportsAgent } from "@pond/schema";
import { Settings, Switch } from "@pond/ui";
import { EnrichmentModelPicker } from "@/components/enrichment-model-picker";
import { EMBEDDING_CATALOG } from "@/lib/enrichment/model-catalogs";
import { type Binding, defineSection } from "@/lib/settings/engine-types";

interface AiValues {
  provider?: AiProviderId;
  modelId?: string;
  nlCompiler?: boolean;
  agent?: boolean;
  semanticSearch?: boolean;
  embedModelId?: string;
}

function aiValues(binding: Binding): AiValues {
  return binding.values as AiValues;
}

// Agent mode keeps a state-dependent description and disable rule, so it renders
// as a custom row rather than a plain switch field.
function AgentRow({ binding }: { binding: Binding }) {
  const values = aiValues(binding);
  const provider = values.provider ?? "ollama";
  const nlOn = values.nlCompiler === true;
  const supportsAgent = modelSupportsAgent(provider, values.modelId);

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Agent Mode</Settings.ItemTitle>
        <Settings.ItemDescription>
          {!nlOn
            ? "Turn on natural-language search to enable agent mode."
            : supportsAgent
              ? "Let the model reason in steps — inspect your library, group, sample, and answer questions like “a few from each source” or “how many videos vs articles”."
              : "Requires a capable model (OpenAI, Anthropic, Gemini, etc.). The current model stays on single-step search."}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Switch.Root
          checked={nlOn && supportsAgent && values.agent === true}
          disabled={!nlOn || !supportsAgent}
          onCheckedChange={(v) => binding.patch({ agent: v })}
        />
      </Settings.ItemControl>
    </>
  );
}

function EmbeddingRow({ binding }: { binding: Binding }) {
  const values = aiValues(binding);
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Embedding Model</Settings.ItemTitle>
        <Settings.ItemDescription>
          On-device model that powers semantic search.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <EnrichmentModelPicker
          catalog={EMBEDDING_CATALOG}
          value={values.embedModelId ?? ""}
          onChange={(id) => binding.patch({ embedModelId: id })}
        />
      </Settings.ItemControl>
    </>
  );
}

export const aiSection = defineSection("ai", {
  title: "AI",
  description: "Configure how Pond understands and searches your library.",
  groups: [
    {
      title: "Natural Language",
      items: [
        {
          control: "switch",
          key: "nlCompiler",
          title: "Natural-Language Search",
          description:
            "Turn plain English into filters with your selected model. Falls back to built-in matching.",
          keywords: ["nlp", "query", "search", "natural language"],
        },
        {
          control: "custom",
          key: "agent",
          title: "Agent Mode",
          keywords: ["reasoning", "agentic", "steps", "assistant"],
          render: (binding) => <AgentRow binding={binding} />,
        },
      ],
    },
    {
      title: "Semantic Search",
      items: [
        {
          control: "switch",
          key: "semanticSearch",
          title: "Semantic Search",
          description:
            "Search and rank by meaning, not just keywords. Embeddings stay on your device.",
          keywords: ["embeddings", "meaning", "vector", "similarity"],
        },
        {
          control: "custom",
          key: "embedModelId",
          title: "Embedding Model",
          keywords: ["embeddings", "model", "on-device"],
          visible: (values) => (values as AiValues).semanticSearch === true,
          render: (binding) => <EmbeddingRow binding={binding} />,
        },
      ],
    },
  ],
});
