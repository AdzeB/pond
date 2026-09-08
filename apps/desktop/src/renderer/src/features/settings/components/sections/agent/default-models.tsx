import { Button, Settings } from "@pond/ui";
import { ASSISTANT_MODELS } from "@shared/assistant";
import { chosenModelId, displayName } from "@shared/provider-models";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type ModelOption, ModelSelect } from "./model-select";
import styles from "./model-select.module.css";
import type { AgentPrefs, KeyRow } from "./types";

const inherit: ModelOption = {
  id: "",
  name: "Use Language Model",
  provider: "",
  providerName: "",
};

export function DefaultModels({
  agent,
  keys,
  onPatchAgent,
}: {
  agent: AgentPrefs;
  keys: KeyRow[];
  onPatchAgent: (patch: Partial<AgentPrefs>) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const connected = keys.filter((row) => row.hasKey && row.enabled);
  const query = useQuery({
    queryKey: ["assistant-models"],
    queryFn: () => window.pond.query("agent.listAvailableModels", {}),
    enabled: connected.length > 0,
    retry: false,
    staleTime: 30_000,
  });
  const models: ModelOption[] = (query.data?.providers ?? []).flatMap((row) => {
    const catalog = ASSISTANT_MODELS.find((item) => item.id === row.provider);
    if (
      !catalog ||
      !row.ok ||
      !connected.some((key) => key.provider === row.provider)
    )
      return [];
    return row.models.map((model) => ({
      ...model,
      provider: row.provider,
      providerName: catalog.provider,
    }));
  });
  const selected = (provider: string, modelId?: string): ModelOption | null => {
    const catalog = ASSISTANT_MODELS.find((item) => item.id === provider);
    if (!catalog) return null;
    const id = modelId || chosenModelId(provider, agent) || catalog.model;
    return (
      models.find((item) => item.provider === provider && item.id === id) ?? {
        id,
        provider: catalog.id,
        providerName: catalog.provider,
        name: `${displayName(id)}${query.isFetching ? "" : " (unavailable)"}`,
      }
    );
  };
  const update = async (patch: Partial<AgentPrefs>) => {
    setPending(true);
    setError("");
    try {
      await onPatchAgent(patch);
    } catch {
      setError("Could not save model selection. Try again.");
    } finally {
      setPending(false);
    }
  };
  const failures =
    query.data?.providers.filter(
      (row) =>
        row.error && connected.some((key) => key.provider === row.provider),
    ) ?? [];
  const vision = models.filter((model) =>
    ASSISTANT_MODELS.some(
      (catalog) => catalog.id === model.provider && catalog.capabilities.vision,
    ),
  );
  return (
    <Settings.Section aria-label="Default Models">
      <Settings.SectionTitle>Default Models</Settings.SectionTitle>
      <Settings.List>
        <Settings.Item className={styles.modelRow}>
          <Settings.ItemDetails>
            <Settings.ItemTitle>Language Model</Settings.ItemTitle>
            <Settings.ItemDescription className={styles.description}>
              Used for conversations and natural-language search.
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <ModelSelect
            label="Language Model"
            items={models}
            selected={selected(agent.languageModel)}
            disabled={pending || !models.length}
            onChange={(model) =>
              void update({
                languageModel: model.provider,
                modelIds: { ...agent.modelIds, [model.provider]: model.id },
              })
            }
          />
        </Settings.Item>
        <Settings.Item className={styles.modelRow}>
          <Settings.ItemDetails>
            <Settings.ItemTitle>Vision Model</Settings.ItemTitle>
            <Settings.ItemDescription className={styles.description}>
              Used for conversations with images.
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <ModelSelect
            label="Vision Model"
            items={[inherit, ...vision]}
            selected={
              agent.visionModel
                ? selected(agent.visionModel, agent.visionModelId)
                : inherit
            }
            disabled={pending}
            onChange={(model) =>
              void update({
                visionModel: model.provider,
                visionModelId: model.id,
              })
            }
          />
        </Settings.Item>
        {!connected.length ? (
          <p className={styles.notice}>
            Connect a provider above to choose your models.
          </p>
        ) : query.isFetching ? (
          <p className={styles.notice} role="status">
            Loading models
          </p>
        ) : query.isError || failures.length ? (
          <div className={styles.notice} role="alert">
            <p>
              {failures.map((row) => row.error).join(" ") ||
                "Could not load models. Try again."}
            </p>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !models.length ? (
          <p className={styles.notice}>
            No models available. Check your provider connection and try again.
          </p>
        ) : null}
        {error ? (
          <p className={`${styles.notice} ${styles.error}`} role="alert">
            {error}
          </p>
        ) : null}
      </Settings.List>
    </Settings.Section>
  );
}
