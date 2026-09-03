import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import {
  IconComputerOutline18,
  IconGlobe2Outline18,
  IconOrbitSparkleOutline18,
  IconServerOutline18,
  IconStarOutline18,
  IconWandSparkleOutline18,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import { Accordion, Button, Field, Input, Select, Switch } from "@pond/ui";
import type { AssistantProvider } from "@shared/assistant";
import { chosenModelId, displayName } from "@shared/provider-models";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { gentleSpring } from "@/lib/ui/motion";
import type { AgentPrefs, KeyRow } from "../types";
import styles from "./styles.module.css";

const ListedModelsSchema = z.object({
  ok: z.boolean(),
  models: z.array(z.object({ id: z.string(), name: z.string() })),
  error: z.string().optional(),
});

const ICONS: Record<AssistantProvider, IconComponent> = {
  anthropic: IconOrbitSparkleOutline18,
  openai: IconWandSparkleOutline18,
  gemini: IconStarOutline18,
  ollama: IconComputerOutline18,
  lmstudio: IconServerOutline18,
  compatible: IconGlobe2Outline18,
};

interface Catalog {
  id: AssistantProvider;
  provider: string;
  needsKey: boolean;
}

function storedEndpoint(catalog: Catalog, agent: AgentPrefs): string {
  if (catalog.id === "ollama") return agent.ollamaBaseUrl ?? "";
  if (catalog.id === "lmstudio") return agent.lmstudioBaseUrl ?? "";
  if (catalog.id === "compatible") return agent.compatibleBaseUrl ?? "";
  return "";
}

function hasEndpoint(id: AssistantProvider): boolean {
  return id === "ollama" || id === "lmstudio" || id === "compatible";
}

export function ProviderCard({
  catalog,
  row,
  selected,
  open,
  agent,
  onPatchAgent,
  onRefresh,
}: {
  catalog: Catalog;
  row: KeyRow | undefined;
  selected: boolean;
  open: boolean;
  agent: AgentPrefs;
  onPatchAgent: (patch: Partial<AgentPrefs>) => void;
  onRefresh: () => Promise<void>;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = ICONS[catalog.id];
  const connected = Boolean(row?.hasKey);
  const endpointValue = storedEndpoint(catalog, agent);
  const selectedModelId = chosenModelId(catalog.id, agent);
  const [keyDraft, setKeyDraft] = useState("");
  const [endpointDraft, setEndpointDraft] = useState(endpointValue);
  const [modelDraft, setModelDraft] = useState(selectedModelId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [liveModels, setLiveModels] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [modelsError, setModelsError] = useState("");
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    setEndpointDraft(endpointValue);
  }, [endpointValue]);

  useEffect(() => {
    setModelDraft(selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    if (!open || !connected) {
      setLiveModels([]);
      setModelsError("");
      setModelsLoading(false);
      return;
    }
    let cancelled = false;
    setLiveModels([]);
    setModelsLoading(true);
    setModelsError("");
    void window.pond
      .query("agent.listModels", { provider: catalog.id })
      .then((res) => {
        if (cancelled) return;
        const listed = ListedModelsSchema.parse(res);
        setLiveModels(listed.ok ? listed.models : []);
        setModelsError(
          listed.ok
            ? ""
            : (listed.error ??
                "Could not list models. Check the key and try again."),
        );
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalog.id, connected, open]);

  const modelItems = useMemo(() => {
    const items = liveModels.map((model) => ({
      value: model.id,
      label: model.name,
    }));
    if (
      selectedModelId &&
      !items.some((item) => item.value === selectedModelId)
    ) {
      items.unshift({
        value: selectedModelId,
        label: displayName(selectedModelId),
      });
    }
    return items;
  }, [liveModels, selectedModelId]);

  const persistModelId = (id: string) => {
    const modelIds = { ...agent.modelIds, [catalog.id]: id };
    if (catalog.id === "ollama") onPatchAgent({ modelIds, ollamaModelId: id });
    else if (catalog.id === "lmstudio")
      onPatchAgent({ modelIds, lmstudioModelId: id });
    else if (catalog.id === "compatible")
      onPatchAgent({ modelIds, compatibleModelId: id });
    else onPatchAgent({ modelIds });
  };

  const persistEndpoint = async () => {
    const next =
      catalog.id === "ollama"
        ? { ollamaBaseUrl: endpointDraft }
        : catalog.id === "lmstudio"
          ? { lmstudioBaseUrl: endpointDraft }
          : catalog.id === "compatible"
            ? { compatibleBaseUrl: endpointDraft }
            : null;
    if (!next) return;
    onPatchAgent(next);
    await window.pond.query("settings.setPrefs", { agent: next });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      if (hasEndpoint(catalog.id)) await persistEndpoint();
      const result = (await window.pond.query("agent.saveKey", {
        provider: catalog.id,
        key: keyDraft,
      })) as { ok: boolean; error?: string };
      if (!result.ok) {
        setError(
          result.error ?? "Could not verify this key. Check it and try again.",
        );
        return;
      }
      setKeyDraft("");
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const status = selected ? "In use" : connected ? "Connected" : undefined;

  return (
    <Accordion.Item
      value={catalog.id}
      className={styles.card}
      data-open={open || undefined}
    >
      <div className={styles.header}>
        <Accordion.Header className={styles.heading}>
          <Accordion.Trigger className={styles.trigger}>
            <span className={styles.icon} aria-hidden>
              <Icon />
            </span>
            <span className={styles.name}>{catalog.provider}</span>
            {status ? <span className={styles.status}>{status}</span> : null}
            <span className={styles.caret} aria-hidden>
              <ChevronRight />
            </span>
          </Accordion.Trigger>
        </Accordion.Header>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className={styles.body}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : gentleSpring}
          >
            <div className={styles.fields}>
              {hasEndpoint(catalog.id) ? (
                <Field.Root>
                  <Field.Label>API Base</Field.Label>
                  <Input.Root size="sm" className={styles.control}>
                    <Input.Field
                      required
                      value={endpointDraft}
                      onChange={(event) => setEndpointDraft(event.target.value)}
                      onBlur={() => void persistEndpoint()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                  </Input.Root>
                </Field.Root>
              ) : null}
              {!connected ? (
                <Field.Root>
                  <Field.Label>Key</Field.Label>
                  <Input.Root size="sm" className={styles.control}>
                    <Input.Field
                      type="password"
                      required={catalog.needsKey}
                      value={keyDraft}
                      onChange={(event) => setKeyDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void save();
                      }}
                    />
                  </Input.Root>
                  {catalog.needsKey ? null : (
                    <Field.Description>
                      Verifies the local endpoint. A key is optional.
                    </Field.Description>
                  )}
                </Field.Root>
              ) : null}
              {connected ? (
                <Field.Root>
                  <Field.Label>Model</Field.Label>
                  <Select.Root
                    value={selectedModelId || undefined}
                    disabled={modelsLoading || !modelItems.length}
                    onValueChange={(value) => {
                      if (!value) return;
                      const id = String(value);
                      setModelDraft(id);
                      persistModelId(id);
                    }}
                  >
                    <Select.Trigger size="sm" className={styles.select}>
                      <Select.Value>
                        {(value: string) =>
                          modelsLoading
                            ? "Loading models"
                            : (modelItems.find((item) => item.value === value)
                                ?.label ??
                              (value
                                ? displayName(String(value))
                                : "Choose a model"))
                        }
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={6}>
                        <Select.Popup>
                          <Select.Items items={modelItems} />
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                  {modelsError ? (
                    <Field.Description>{modelsError}</Field.Description>
                  ) : null}
                </Field.Root>
              ) : null}
              {connected ? (
                <Field.Root>
                  <Field.Label>Custom Model ID</Field.Label>
                  <Input.Root size="sm" className={styles.control}>
                    <Input.Field
                      value={modelDraft}
                      onChange={(event) => setModelDraft(event.target.value)}
                      onBlur={() => persistModelId(modelDraft)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                  </Input.Root>
                </Field.Root>
              ) : null}
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className={styles.footer}>
              {connected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  onClick={() => {
                    void window.pond
                      .query("agent.removeKey", { provider: catalog.id })
                      .then(() => onRefresh());
                  }}
                >
                  Remove
                </Button>
              ) : null}
              <span className={styles.spacer} />
              {connected ? (
                <Switch.Root
                  checked={row?.enabled ?? true}
                  aria-label="Enable"
                  onCheckedChange={(checked) => {
                    void window.pond
                      .query("agent.setKeyEnabled", {
                        provider: catalog.id,
                        enabled: Boolean(checked),
                      })
                      .then(() => onRefresh());
                  }}
                />
              ) : null}
              {connected && !selected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onPatchAgent({ languageModel: catalog.id })}
                >
                  Use in Agent
                </Button>
              ) : null}
              {!connected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  Save
                </Button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Accordion.Item>
  );
}
