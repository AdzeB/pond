import { IconSparkleFill18 as Sparkle } from "@pond/icons/fill/18";
import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import {
  AI_PROVIDERS,
  type AiProviderId,
  modelSupportsAgent,
} from "@pond/schema";
import { Settings, Switch } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { ModelPicker } from "@/components/model-picker";
import { EMBEDDING_CATALOG } from "@/lib/enrichment/model-catalogs";
import { childrenOf } from "@/lib/settings/registry";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

const NAV_ROWS = childrenOf("ai");

export function AiHub() {
  const [prefs, patch] = usePrefs("ai");

  const provider = (prefs.provider ?? "ollama") as AiProviderId;
  const nlOn = prefs.nlCompiler === true;
  const supportsAgent = modelSupportsAgent(provider, prefs.modelId);

  // Per-row trailing summary keyed by section id.
  const summaries: Record<string, string | undefined> = {
    "ai-models": AI_PROVIDERS[provider]?.label,
  };

  return (
    <Settings.Page width="medium">
      <div className={styles.hero}>
        <span className={styles.heroIcon}>
          <Sparkle width={24} height={24} />
        </span>
        <h1 className={styles.heroTitle}>Artificial Intelligence</h1>
        <p className={styles.heroSubtitle}>
          Configure how Pond understands and searches your library.
        </p>
      </div>

      <Settings.Section>
        <div className={styles.navCard}>
          {NAV_ROWS.map((row) => (
            <Link
              key={row.id}
              to="/settings/$section"
              params={{ section: row.path }}
              className={styles.navRow}
            >
              <span className={styles.navIcon}>
                <row.icon width={17} height={17} />
              </span>
              <span className={styles.navLabel}>{row.label}</span>
              {summaries[row.id] ? (
                <span className={styles.navSummary}>{summaries[row.id]}</span>
              ) : null}
              <ChevronRight
                className={styles.navChevron}
                width={12}
                height={12}
              />
            </Link>
          ))}
        </div>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Natural language</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Natural-language search</Settings.ItemTitle>
              <Settings.ItemDescription>
                Turn plain English into filters with your selected model. Falls
                back to built-in matching.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={prefs.nlCompiler === true}
                onCheckedChange={(v) => patch({ nlCompiler: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Agent mode</Settings.ItemTitle>
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
                checked={nlOn && supportsAgent && prefs.agent === true}
                disabled={!nlOn || !supportsAgent}
                onCheckedChange={(v) => patch({ agent: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Semantic search</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Semantic search</Settings.ItemTitle>
              <Settings.ItemDescription>
                Search and rank by meaning, not just keywords. Embeddings stay
                on your device.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={prefs.semanticSearch === true}
                onCheckedChange={(v) => patch({ semanticSearch: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          {prefs.semanticSearch ? (
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Embedding model</Settings.ItemTitle>
                <Settings.ItemDescription>
                  On-device model that powers semantic search.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <ModelPicker
                  catalog={EMBEDDING_CATALOG}
                  value={prefs.embedModelId ?? ""}
                  onChange={(id) => patch({ embedModelId: id })}
                />
              </Settings.ItemControl>
            </Settings.Item>
          ) : null}
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}
