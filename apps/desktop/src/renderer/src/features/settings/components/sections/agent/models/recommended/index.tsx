import { Button, Settings } from "@pond/ui";
import type { AssistantProvider } from "@shared/assistant";
import { RECOMMENDED_LOCAL_MODELS } from "@shared/provider-models";
import type { CatalogModel } from "../types";
import styles from "./styles.module.css";

interface RecommendedProvider {
  id: AssistantProvider;
  provider: string;
  setupUrl?: string;
}

function gigabytes(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value / 1_000_000_000)} GB`;
}

export function RecommendedLocalModels({
  providers,
  installedModels,
  selectedModelIds,
  onCopyCommand,
  onOpenSetup,
  onSelect,
}: {
  providers: readonly RecommendedProvider[];
  installedModels: CatalogModel[];
  selectedModelIds: Partial<Record<AssistantProvider, string>>;
  onCopyCommand: (command: string) => void | Promise<void>;
  onOpenSetup: (url: string) => void;
  onSelect: (
    provider: AssistantProvider,
    modelId: string,
  ) => void | Promise<void>;
}) {
  if (!providers.length) return null;
  return (
    <Settings.Section aria-label="Recommended Local Models">
      <Settings.SectionDetails>
        <Settings.SectionTitle>Recommended Local Models</Settings.SectionTitle>
        <Settings.SectionDescription>
          Install models in your local runtime, then select one for Assistant.
        </Settings.SectionDescription>
      </Settings.SectionDetails>
      <Settings.List>
        {providers.flatMap((provider) =>
          RECOMMENDED_LOCAL_MODELS.map((recommendation) => {
            const installed = installedModels.find(
              (model) =>
                model.provider === provider.id &&
                model.id === recommendation.id &&
                model.available !== false,
            );
            const selected =
              installed !== undefined &&
              selectedModelIds[provider.id] === recommendation.id;
            const size = installed?.sizeBytes
              ? `Installed size: ${gigabytes(installed.sizeBytes)}`
              : `Estimated download: ${gigabytes(recommendation.minimumDiskBytes)}`;
            const tier =
              recommendation.tier === "default"
                ? "Default local choice"
                : "Higher-quality local choice";
            const command = `ollama pull ${recommendation.id}`;
            return (
              <Settings.Item key={`${provider.id}:${recommendation.id}`}>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>{recommendation.name}</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    {installed
                      ? `${tier} for ${provider.provider}. ${size}.`
                      : provider.id === "ollama"
                        ? `Run this command in Terminal. ${size}.`
                        : `Find this model in ${provider.provider}. ${size}.`}
                  </Settings.ItemDescription>
                  {!installed && provider.id === "ollama" ? (
                    <code className={styles.command}>{command}</code>
                  ) : null}
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  {installed ? (
                    <Button
                      size="sm"
                      disabled={selected}
                      onClick={() =>
                        void onSelect(provider.id, recommendation.id)
                      }
                    >
                      {selected ? "Selected" : "Select"}
                    </Button>
                  ) : provider.id === "ollama" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void onCopyCommand(command)}
                    >
                      Copy Install Command
                    </Button>
                  ) : provider.setupUrl ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenSetup(provider.setupUrl ?? "")}
                    >
                      Open {provider.provider}
                    </Button>
                  ) : null}
                </Settings.ItemControl>
              </Settings.Item>
            );
          }),
        )}
      </Settings.List>
    </Settings.Section>
  );
}
