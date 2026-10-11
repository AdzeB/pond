import { Button, Loader, Settings } from "@pond/ui";
import { chosenModelId } from "@shared/provider-models";
import { useQueryClient } from "@tanstack/react-query";
import { savePrefsSection, usePrefs } from "@/shared/state/prefs";
import type { AgentPrefs } from "../types";
import { ModelCatalogTable } from "./catalog-table";
import { ModelsLoading } from "./loading";
import { RecommendedLocalModels } from "./recommended";
import styles from "./styles.module.css";
import { useModelsCatalog } from "./use-models-catalog";

export { ModelCatalogTable } from "./catalog-table";
export { RecommendedLocalModels } from "./recommended";
export type { CatalogModel } from "./types";

function CatalogUnavailable({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Settings.List>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Models unavailable</Settings.ItemTitle>
          <Settings.ItemDescription>{message}</Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        </Settings.ItemControl>
      </Settings.Item>
    </Settings.List>
  );
}

export function ModelsSection() {
  const [agent, , loaded] = usePrefs("agent");
  const client = useQueryClient();
  const {
    connectionsPending,
    fetching,
    pending,
    models,
    installedModels,
    errors,
    localProviders,
    loadError,
    retry,
  } = useModelsCatalog(agent);
  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Models</Settings.Title>
          <Settings.Description>
            Choose which models appear in Assistant.
          </Settings.Description>
        </Settings.HeaderText>
        <Button
          className={styles.refresh}
          size="sm"
          variant="ghost"
          disabled={fetching}
          aria-label={fetching ? "Loading models" : "Refresh"}
          onClick={retry}
        >
          {fetching ? <Loader.Dots /> : "Refresh"}
        </Button>
      </Settings.Header>
      {!loaded || connectionsPending || (pending && !models.length) ? (
        <ModelsLoading />
      ) : loadError ? (
        <CatalogUnavailable message={loadError} onRetry={retry} />
      ) : (
        <>
          <RecommendedLocalModels
            providers={localProviders}
            installedModels={installedModels}
            selectedModelIds={Object.fromEntries(
              localProviders.map((provider) => [
                provider.id,
                chosenModelId(provider.id, agent),
              ]),
            )}
            onCopyCommand={async (command) => {
              await window.pond.query("clipboard.writeText", { text: command });
            }}
            onOpenSetup={(url) => {
              void window.pond.openExternal(url);
            }}
            onSelect={async (provider, id) => {
              const currentVisible = new Set(
                agent.visibleModelIds?.[provider] ??
                  models
                    .filter(
                      (model) =>
                        model.provider === provider &&
                        model.available !== false,
                    )
                    .map((model) => model.id),
              );
              currentVisible.add(id);
              const next: Partial<AgentPrefs> = {
                languageModel: provider,
                modelIds: { ...agent.modelIds, [provider]: id },
                visibleModelIds: {
                  ...agent.visibleModelIds,
                  [provider]: [...currentVisible],
                },
              };
              if (provider === "ollama") next.ollamaModelId = id;
              if (provider === "lmstudio") next.lmstudioModelId = id;
              await savePrefsSection("agent", next);
              await client.invalidateQueries({
                queryKey: ["assistant-models"],
              });
            }}
          />
          <Settings.Section className={styles.section}>
            {errors.length ? (
              <div className={styles.notice} role="alert">
                <span>
                  {errors.length === 1
                    ? errors[0]
                    : "Some providers could not load models. Try again."}
                </span>
                <Button size="xs" variant="ghost" onClick={retry}>
                  Retry
                </Button>
              </div>
            ) : null}
            <ModelCatalogTable
              models={models}
              visibleByProvider={agent.visibleModelIds ?? {}}
              onSave={async (visibleModelIds) => {
                await savePrefsSection("agent", { visibleModelIds });
                await client.invalidateQueries({
                  queryKey: ["assistant-models"],
                });
              }}
            />
          </Settings.Section>
        </>
      )}
    </Settings.Page>
  );
}
