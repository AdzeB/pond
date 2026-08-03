import { IconCircleCheckFill18 } from "@pond/icons/fill/18";
import { IconChevronLeftOutline18 as Back } from "@pond/icons/outline/18";
import {
  AI_PROVIDER_IDS,
  AI_PROVIDERS,
  type AiModelEntry,
  type AiProviderId,
  providerModels,
} from "@pond/schema";
import { Input, Settings } from "@pond/ui";
import { useMemo, useState } from "react";
import { ProviderLogo } from "@/components/shared/provider-logo";
import { usePrefs } from "@/stores/prefs";
import { settingsModal } from "@/stores/settings-modal";
import styles from "./styles.module.css";

const LOCAL_PROVIDER_IDS: readonly AiProviderId[] = [
  "bundled",
  "ollama",
  "lmstudio",
  "custom",
];

const CLOUD_PROVIDER_IDS: readonly AiProviderId[] = AI_PROVIDER_IDS.filter(
  (id) => !LOCAL_PROVIDER_IDS.includes(id),
);

const COLLAPSED_COUNT = 4;

function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${m % 1 ? m.toFixed(1) : m}M`;
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

/** The catalog only carries context + agent capability, so card copy is derived from those. */
function describeModel(model: AiModelEntry): string {
  const parts: string[] = [];
  if (model.context > 0)
    parts.push(`${formatContext(model.context)} token context window.`);
  parts.push(
    model.agent
      ? "Can drive multi-step agent search."
      : "Single-step search only.",
  );
  return parts.join(" ");
}

/** Provider default model leads its grid so the sensible pick is always the first card. */
function orderedModels(provider: AiProviderId): AiModelEntry[] {
  const models = providerModels(provider);
  const def = AI_PROVIDERS[provider].defaultModel;
  return [...models].sort((a, b) =>
    a.id === def ? -1 : b.id === def ? 1 : a.name.localeCompare(b.name),
  );
}

function Card({
  selected,
  onSelect,
  logo,
  name,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  logo: React.ReactNode;
  name: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className={styles.card}
      data-selected={selected || undefined}
      onClick={onSelect}
    >
      <span className={styles.cardHead}>
        <span className={styles.cardLogo}>{logo}</span>
        <span className={styles.cardName}>{name}</span>
        {selected ? (
          <span className={styles.cardCheck}>
            <IconCircleCheckFill18 />
          </span>
        ) : null}
      </span>
      <span className={styles.cardDescription}>{description}</span>
    </button>
  );
}

function SectionHead({
  provider,
  title,
}: {
  provider?: AiProviderId;
  title: string;
}) {
  return (
    <header className={styles.sectionHead}>
      <h3 className={styles.sectionTitle}>
        {provider ? <ProviderLogo provider={provider} size={18} /> : null}
        {title}
      </h3>
      <span className={styles.rule} />
    </header>
  );
}

interface PickerState {
  provider: AiProviderId;
  modelId: string;
  pickProvider: (provider: AiProviderId) => void;
  pickModel: (provider: AiProviderId, modelId: string) => void;
}

function LocalSection({ picker }: { picker: PickerState }) {
  return (
    <section className={styles.section}>
      <SectionHead title="Local" />
      <div className={styles.grid}>
        {LOCAL_PROVIDER_IDS.map((id) => (
          <Card
            key={id}
            selected={picker.provider === id}
            onSelect={() => picker.pickProvider(id)}
            logo={<ProviderLogo provider={id} size={22} />}
            name={AI_PROVIDERS[id].label}
            description={AI_PROVIDERS[id].hint}
          />
        ))}
      </div>
    </section>
  );
}

function CloudSection({
  picker,
  provider,
  query,
}: {
  picker: PickerState;
  provider: AiProviderId;
  query: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const meta = AI_PROVIDERS[provider];
  const models = useMemo(() => orderedModels(provider), [provider]);

  const trimmed = query.trim().toLowerCase();
  const filtered = models.filter(
    (m) =>
      !trimmed ||
      m.id.toLowerCase().includes(trimmed) ||
      m.name.toLowerCase().includes(trimmed),
  );
  if (filtered.length === 0) return null;

  const expanded = Boolean(trimmed) || showAll;
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED_COUNT);
  const hidden = filtered.length - visible.length;
  const activeModel = picker.modelId.trim() || meta.defaultModel;

  return (
    <section className={styles.section}>
      <SectionHead provider={provider} title={meta.label} />
      <div className={styles.grid}>
        {visible.map((m) => (
          <Card
            key={m.id}
            selected={picker.provider === provider && activeModel === m.id}
            onSelect={() => picker.pickModel(provider, m.id)}
            logo={<ProviderLogo provider={provider} size={22} />}
            name={m.name}
            description={describeModel(m)}
          />
        ))}
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          className={styles.more}
          onClick={() => setShowAll(true)}
        >
          Show all {filtered.length}
        </button>
      ) : null}
    </section>
  );
}

function PickerBody() {
  const [ai, patch] = usePrefs("ai");
  const provider = ai.provider ?? "ollama";

  const [query, setQuery] = useState("");

  const picker: PickerState = {
    provider,
    modelId: ai.modelId ?? "",
    pickProvider: (id) => patch({ provider: id }),
    pickModel: (id, modelId) => patch({ provider: id, modelId }),
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Input.Field
          data-size="sm"
          placeholder="Search models…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 220 }}
        />
      </div>

      <div className={styles.sections}>
        {query.trim() ? null : <LocalSection picker={picker} />}
        {CLOUD_PROVIDER_IDS.map((id) => (
          <CloudSection key={id} picker={picker} provider={id} query={query} />
        ))}
      </div>
    </div>
  );
}

/** Nested settings page reached from AI -> Model; hidden from the sidebar index. */
export function AiProvidersSection() {
  return (
    <>
      <button
        type="button"
        className={styles.crumb}
        onClick={() => settingsModal.open("ai")}
      >
        <Back width={14} height={14} />
        AI
      </button>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Provider &amp; Model</Settings.Title>
          <Settings.Description>
            Pick the provider and model that power AI features. Endpoint and API
            key live on the AI page.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>
      <PickerBody />
    </>
  );
}
