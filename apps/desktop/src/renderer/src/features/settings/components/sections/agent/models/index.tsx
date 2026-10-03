import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import {
  Accordion,
  Button,
  Checkbox,
  Input,
  Loader,
  Settings,
  Tooltip,
} from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import { modelsForChooser, type ProviderModel } from "@shared/provider-models";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { openSettings } from "@/features/settings/lib/open-settings";
import { savePrefsSection, usePrefs } from "@/features/settings/state/prefs";
import { ProviderLogo } from "../icons";
import { type AgentPrefs, keyRowsSchema } from "../types";
import { ModelsLoading } from "./loading";
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
  const connections = useQuery({
    queryKey: ["agent-provider-connections"],
    queryFn: async () =>
      keyRowsSchema.parse(await window.pond.query("agent.keys", {})),
    staleTime: 15 * 60_000,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const connected = ASSISTANT_MODELS.filter(
    (entry) =>
      !connections.isError &&
      connections.data?.some(
        (row) => row.provider === entry.id && row.hasKey && row.enabled,
      ),
  );
  const queries = useQueries({
    queries: connected.map((entry) => ({
      queryKey: ["all-provider-models", entry.id],
      queryFn: async () =>
        window.pond.query("agent.listModels", { provider: entry.id }),
      staleTime: 15 * 60_000,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    })),
  });
  const fetching =
    connections.isFetching || queries.some((query) => query.isFetching);
  const pending = queries.some((query) => query.isPending);
  const rows = connected.flatMap((entry, index) => {
    const query = queries[index];
    if (!query || query.isPending) return [];
    return [
      {
        provider: entry.id,
        providerName: entry.provider,
        models: query?.data?.models ?? [],
        error: query?.isError
          ? `Could not load models from ${entry.provider}. Try again.`
          : query?.data?.error,
      },
    ];
  });
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
  const loadError = connections.isError
    ? "Could not load providers. Try again."
    : catalogLoadError(
        queries.length > 0 && queries.every((query) => query.isError),
        models,
        errors,
      );
  const retry = () => {
    void connections.refetch();
    for (const query of queries) void query.refetch();
  };
  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Models</Settings.Title>
          <Settings.Description>
            Choose which models appear in Agent.
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
      {!loaded || connections.isPending || (pending && !models.length) ? (
        <ModelsLoading />
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
  onOpenProviders = () => openSettings("providers"),
}: {
  models: CatalogModel[];
  visibleByProvider: VisibleModelIds;
  onSave: (visibleModelIds: VisibleModelIds) => Promise<void>;
  onOpenProviders?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(new Set<AssistantProvider>());
  const needle = search.trim().toLowerCase();
  const filtered = models.filter((model) =>
    `${model.name} ${model.id} ${model.providerName}`
      .toLowerCase()
      .includes(needle),
  );
  const groups = new Map<
    AssistantProvider,
    { name: string; models: CatalogModel[] }
  >();
  for (const model of filtered) {
    const group = groups.get(model.provider);
    if (group) group.models.push(model);
    else {
      groups.set(model.provider, {
        name: model.providerName,
        models: [model],
      });
    }
  }
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
            onValueChange={(value) => {
              setSearch(value);
              if (value.trim()) setCollapsed(new Set());
            }}
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
      <Accordion.Root
        multiple
        className={styles.groups}
        value={[...groups.keys()].filter(
          (provider) => !collapsed.has(provider),
        )}
        onValueChange={(expanded) => {
          setCollapsed((current) => {
            const next = new Set(current);
            for (const provider of groups.keys()) {
              if (expanded.includes(provider)) next.delete(provider);
              else next.add(provider);
            }
            return next;
          });
        }}
      >
        {[...groups].map(([provider, group]) => (
          <Accordion.Item key={provider} value={provider}>
            <Accordion.Header render={<h2 aria-label={group.name} />}>
              <Accordion.Trigger
                className={styles["group-header"]}
                aria-label={group.name}
              >
                <span id={`provider-${provider}`} className={styles.provider}>
                  <ProviderLogo provider={provider} size={20} />
                  {group.name}
                </span>
                <span className={styles.count} aria-hidden="true">
                  {group.models.length}
                </span>
                <IconChevronDownOutline12 />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className={styles.panel}>
              {group.models.some((model) => model.available === false) ? (
                <div
                  className={styles.connection}
                  id={`connection-${provider}`}
                >
                  <p>Check the provider connection to select models.</p>
                  <Button size="xs" variant="ghost" onClick={onOpenProviders}>
                    Open Providers
                  </Button>
                </div>
              ) : null}
              <Settings.List>
                <table
                  className={styles.table}
                  aria-labelledby={`provider-${provider}`}
                >
                  <thead>
                    <tr>
                      <th scope="col">Model</th>
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
                      <th
                        scope="col"
                        className={styles.check}
                        aria-label="Show"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {group.models.map((model) => {
                      const input = tokenPrice(model.pricing?.input);
                      const output = tokenPrice(model.pricing?.output);
                      const inputHint = priceHint(
                        "Input",
                        model.pricing?.input,
                      );
                      const outputHint = priceHint(
                        "Output",
                        model.pricing?.output,
                      );
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
                              aria-describedby={
                                model.available === false
                                  ? `connection-${provider}`
                                  : undefined
                              }
                              onCheckedChange={(checked) => {
                                const next = new Set(
                                  providerVisible(model.provider),
                                );
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
              </Settings.List>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
      {!filtered.length ? (
        <p className={styles.empty}>
          {models.length
            ? "No models found. Try another name."
            : "No models found. Connect a provider first."}
        </p>
      ) : null}
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
