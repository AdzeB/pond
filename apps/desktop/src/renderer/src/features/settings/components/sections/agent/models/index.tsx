import { Button, Checkbox, Input, Settings, Tooltip } from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import { modelsForChooser, type ProviderModel } from "@shared/provider-models";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { savePrefsSection, usePrefs } from "@/features/settings/state/prefs";
import { ProviderLogo } from "../icons";
import type { AgentPrefs } from "../types";
import styles from "./styles.module.css";

const priceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

type VisibleModelIds = NonNullable<AgentPrefs["visibleModelIds"]>;

export type CatalogModel = ProviderModel & {
  provider: AssistantProvider;
  providerName: string;
};

function compactTokens(value: number | undefined): string {
  if (!value) return "—";
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
  }
  return String(value);
}

function tokenPrice(value: string | undefined): string {
  if (value === undefined || !value.trim()) return "—";
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return "—";
  return `${priceFormat.format(price * 1_000_000)}/M`;
}

function priceHint(
  kind: "Input" | "Output",
  value: string | undefined,
): string | undefined {
  const text = tokenPrice(value);
  if (text === "—") return undefined;
  return `${kind} ${text.replace(/\/M$/, "")} per million tokens`;
}

function contextHint(value: number | undefined): string {
  if (!value) return "Not reported by provider";
  return `${value.toLocaleString()} token context window`;
}

function Hint({ label, children }: { label?: string; children: ReactElement }) {
  if (!label) return children;
  return (
    <Tooltip label={label} side="top">
      {children}
    </Tooltip>
  );
}

function modelHint(model: CatalogModel): string {
  const parts: string[] = [];
  if (model.description) parts.push(model.description);
  if (model.maxOutputTokens) {
    parts.push(`${model.maxOutputTokens.toLocaleString()} output tokens`);
  }
  return parts.join(". ");
}

function selectedIds(models: CatalogModel[], visibleIds: string[] | undefined) {
  const selectable = models.filter((model) => model.available !== false);
  return new Set(visibleIds ?? selectable.map((model) => model.id));
}

async function loadCatalog() {
  return Promise.all(
    ASSISTANT_MODELS.map(async (entry) => {
      try {
        const listed = await window.pond.query("agent.listModels", {
          provider: entry.id,
        });
        return {
          provider: entry.id,
          providerName: entry.provider,
          ...listed,
        };
      } catch {
        return {
          provider: entry.id,
          providerName: entry.provider,
          ok: false,
          models: [],
          error: `Could not load models from ${entry.provider}. Try again.`,
        };
      }
    }),
  );
}

function uniqueErrors(rows: Array<{ error?: string }>) {
  return [...new Set(rows.flatMap((row) => (row.error ? [row.error] : [])))];
}

function catalogLoadError(
  isError: boolean,
  models: CatalogModel[],
  errors: string[],
) {
  if (models.length) return null;
  if (isError) return "Could not load models. Try again.";
  if (!errors.length) return null;
  return errors.length === 1 ? errors[0] : "Could not load models. Try again.";
}

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
  const query = useQuery({
    queryKey: ["all-provider-models"],
    queryFn: loadCatalog,
    retry: false,
  });
  const rows = query.data ?? [];
  const models: CatalogModel[] = rows
    .flatMap((row) => {
      const listed = row.models ?? [];
      const customIds = agent.customModelIds?.[row.provider] ?? [];
      const visibleIds = agent.visibleModelIds?.[row.provider];
      return modelsForChooser(listed, [
        ...listed.map((model) => model.id),
        ...customIds,
        ...(visibleIds ?? []),
      ]).map((model) => ({
        ...model,
        provider: row.provider,
        providerName: row.providerName,
      }));
    })
    .sort(
      (a, b) =>
        a.providerName.localeCompare(b.providerName) ||
        a.name.localeCompare(b.name),
    );
  const errors = uniqueErrors(rows);
  const loadError = catalogLoadError(query.isError, models, errors);
  const retry = () => void query.refetch();
  return (
    <Settings.Page width="wide">
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Models</Settings.Title>
          <Settings.Description>
            Choose which models appear in Agent.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>
      {!loaded || query.isPending ? (
        <p role="status">Loading models</p>
      ) : loadError ? (
        <CatalogUnavailable message={loadError} onRetry={retry} />
      ) : (
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
      )}
    </Settings.Page>
  );
}

export function ModelCatalogTable({
  models,
  visibleByProvider,
  onSave,
}: {
  models: CatalogModel[];
  visibleByProvider: VisibleModelIds;
  onSave: (visibleModelIds: VisibleModelIds) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const needle = search.trim().toLowerCase();
  const filtered = models.filter((model) =>
    `${model.name} ${model.id} ${model.providerName}`
      .toLowerCase()
      .includes(needle),
  );
  const selectable = models.filter((model) => model.available !== false);
  const shownCount = selectable.filter((model) =>
    selectedIds(
      models.filter((item) => item.provider === model.provider),
      visibleByProvider[model.provider],
    ).has(model.id),
  ).length;

  async function save(next: VisibleModelIds) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onSave(next);
    } catch {
      setError("Could not save model visibility. Try again.");
    } finally {
      setPending(false);
    }
  }

  function providerVisible(provider: AssistantProvider) {
    return selectedIds(
      models.filter((model) => model.provider === provider),
      visibleByProvider[provider],
    );
  }

  function allVisible() {
    const next = { ...visibleByProvider };
    const byProvider = new Map<AssistantProvider, string[]>();
    for (const model of selectable) {
      const ids = byProvider.get(model.provider) ?? [];
      ids.push(model.id);
      byProvider.set(model.provider, ids);
    }
    for (const [provider, ids] of byProvider) next[provider] = ids;
    return next;
  }

  function noneVisible() {
    const next = { ...visibleByProvider };
    for (const model of models) next[model.provider] = [];
    return next;
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Input.Root size="sm">
          <Input.Field
            aria-label="Search models"
            placeholder="Search models…"
            value={search}
            onValueChange={setSearch}
          />
        </Input.Root>
        <Button
          size="xs"
          variant="ghost"
          disabled={
            pending || !selectable.length || shownCount === selectable.length
          }
          onClick={() => void save(allVisible())}
        >
          Show All
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={pending || !shownCount}
          onClick={() => void save(noneVisible())}
        >
          Hide All
        </Button>
      </div>
      <Settings.List>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Provider</th>
              <th scope="col" className={styles.metric}>
                <Hint label="Price per million input tokens.">
                  <span>Input</span>
                </Hint>
              </th>
              <th scope="col" className={styles.metric}>
                <Hint label="Price per million output tokens.">
                  <span>Output</span>
                </Hint>
              </th>
              <th scope="col" className={styles.context}>
                <Hint label="Context window in tokens.">
                  <span>Context</span>
                </Hint>
              </th>
              <th scope="col" className={styles.check} aria-label="Show" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((model) => {
              const input = tokenPrice(model.pricing?.input);
              const output = tokenPrice(model.pricing?.output);
              const inputHint = priceHint("Input", model.pricing?.input);
              const outputHint = priceHint("Output", model.pricing?.output);
              const tokens = compactTokens(model.contextWindow);
              const tokensHint = contextHint(model.contextWindow);
              return (
                <tr key={`${model.provider}:${model.id}`}>
                  <td>
                    <Hint label={modelHint(model) || undefined}>
                      <label
                        htmlFor={`model-visible-${model.provider}-${model.id}`}
                        className={styles.name}
                      >
                        {model.name}
                      </label>
                    </Hint>
                  </td>
                  <td>
                    <span className={styles.provider}>
                      <ProviderLogo provider={model.provider} />
                      <span className={styles["provider-name"]}>
                        {model.providerName}
                      </span>
                    </span>
                  </td>
                  <td className={styles.metric}>
                    <Hint label={inputHint}>
                      {inputHint ? (
                        <button
                          type="button"
                          className={styles.hint}
                          aria-label={inputHint}
                        >
                          {input}
                        </button>
                      ) : (
                        <span>{input}</span>
                      )}
                    </Hint>
                  </td>
                  <td className={styles.metric}>
                    <Hint label={outputHint}>
                      {outputHint ? (
                        <button
                          type="button"
                          className={styles.hint}
                          aria-label={outputHint}
                        >
                          {output}
                        </button>
                      ) : (
                        <span>{output}</span>
                      )}
                    </Hint>
                  </td>
                  <td className={styles.context}>
                    <Hint label={tokensHint}>
                      <button
                        type="button"
                        className={styles.hint}
                        aria-label={tokensHint}
                      >
                        {tokens}
                      </button>
                    </Hint>
                  </td>
                  <td className={styles.check}>
                    <Checkbox.Root
                      id={`model-visible-${model.provider}-${model.id}`}
                      size="sm"
                      aria-label={`Show ${model.name} in model pickers`}
                      checked={
                        model.available !== false &&
                        providerVisible(model.provider).has(model.id)
                      }
                      disabled={pending || model.available === false}
                      onCheckedChange={(checked) => {
                        const next = new Set(providerVisible(model.provider));
                        if (checked) next.add(model.id);
                        else next.delete(model.id);
                        void save({
                          ...visibleByProvider,
                          [model.provider]: [...next],
                        });
                      }}
                    >
                      <Checkbox.Indicator />
                    </Checkbox.Root>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length ? (
          <p className={styles.empty}>
            {models.length
              ? "No models found. Try another name."
              : "No models found. Connect a provider first."}
          </p>
        ) : null}
      </Settings.List>
      <div className={styles.summary} role="status">
        {pending
          ? "Saving model visibility"
          : models.length && !selectable.length
            ? `${models.length} models in catalog`
            : `${shownCount} of ${selectable.length} models shown`}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
