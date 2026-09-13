import { IconDotsOutline18 } from "@pond/icons/outline/18";
import { Button, Field, Input, Menu } from "@pond/ui";
import type { AssistantProvider } from "@shared/assistant";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ProviderLogo } from "../icons";
import type { AgentPrefs, KeyRow } from "../types";
import styles from "./provider.module.css";

type Catalog = { id: AssistantProvider; provider: string; needsKey: boolean };

function endpointPatch(
  id: AssistantProvider,
  value: string,
): Partial<AgentPrefs> {
  if (id === "ollama") return { ollamaBaseUrl: value };
  if (id === "lmstudio") return { lmstudioBaseUrl: value };
  if (id === "compatible") return { compatibleBaseUrl: value };
  return {};
}

export function ProviderCard({
  catalog,
  row,
  agent,
  onPatchAgent,
  onRefresh,
  onDismiss,
}: {
  catalog: Catalog;
  row: KeyRow | undefined;
  agent: AgentPrefs;
  onPatchAgent: (patch: Partial<AgentPrefs>) => void | Promise<void>;
  onRefresh: () => Promise<void>;
  onDismiss: () => void;
}) {
  const menuRef = useRef<HTMLButtonElement>(null);
  const connected = Boolean(row?.hasKey);
  const endpoint =
    catalog.id === "ollama"
      ? agent.ollamaBaseUrl
      : catalog.id === "lmstudio"
        ? agent.lmstudioBaseUrl
        : catalog.id === "compatible"
          ? agent.compatibleBaseUrl
          : undefined;
  const [keyDraft, setKeyDraft] = useState("");
  const [endpointDraft, setEndpointDraft] = useState(endpoint ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    setEndpointDraft(endpoint ?? "");
  }, [endpoint]);
  const changed =
    Boolean(keyDraft.trim()) ||
    (endpoint !== undefined && endpointDraft.trim() !== endpoint);
  const refresh = async () => {
    await onRefresh();
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["provider-models", catalog.id],
      }),
      queryClient.invalidateQueries({ queryKey: ["assistant-models"] }),
    ]);
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    let endpointSaved = false;
    let verified = false;
    try {
      if (endpoint !== undefined && endpointDraft.trim() !== endpoint) {
        await onPatchAgent(endpointPatch(catalog.id, endpointDraft.trim()));
        endpointSaved = true;
      }
      const result =
        connected && !keyDraft.trim()
          ? await window.pond.query("agent.listModels", {
              provider: catalog.id,
            })
          : await window.pond.query("agent.saveKey", {
              provider: catalog.id,
              key: keyDraft.trim(),
            });
      if (!result.ok || result.error)
        throw new Error(
          result.error ||
            "Could not connect. Check the settings and try again.",
        );
      verified = true;
      if (!agent.languageModel)
        await onPatchAgent({ languageModel: catalog.id });
      setKeyDraft("");
      await refresh();
      menuRef.current?.focus();
    } catch (cause) {
      if (endpointSaved && !verified && endpoint !== undefined) {
        try {
          await onPatchAgent(endpointPatch(catalog.id, endpoint));
        } catch {
          setError(
            "Could not restore the previous endpoint. Check the settings and try again.",
          );
          return;
        }
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save provider. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!connected) {
      onDismiss();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await window.pond.query("agent.removeKey", {
        provider: catalog.id,
      });
      if (!result.ok) throw new Error("Could not remove provider. Try again.");
      await refresh();
      onDismiss();
    } catch {
      setError("Could not remove provider. Try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className={styles.card} aria-label={catalog.provider}>
      <div className={styles.header}>
        <ProviderLogo provider={catalog.id} size={28} />
        <div className={styles.details}>
          <h3 className={styles.name}>{catalog.provider}</h3>
          <p className={styles.status} role="status">
            {connected
              ? row?.enabled
                ? "Connected"
                : "Disabled"
              : "Enter your connection details."}
          </p>
        </div>
        <Menu.Root>
          <Menu.Trigger
            ref={menuRef}
            size="xs"
            variant="ghost"
            aria-label={`${catalog.provider} options`}
          >
            <IconDotsOutline18 />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="end">
              <Menu.Popup>
                <Menu.Item disabled={saving} onClick={() => void remove()}>
                  {connected ? "Remove Provider" : "Cancel Setup"}
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <form
        className={styles.body}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className={styles.fields}>
          <Field.Root>
            <Field.Label>
              API Key{!catalog.needsKey ? " (Optional)" : ""}
            </Field.Label>
            <Input.Root size="sm">
              <Input.Field
                type="password"
                autoComplete="off"
                required={catalog.needsKey && !connected}
                disabled={saving}
                placeholder={
                  connected ? (row?.masked ?? "Saved key") : "Enter API key"
                }
                value={keyDraft}
                onValueChange={setKeyDraft}
              />
            </Input.Root>
          </Field.Root>
          {endpoint !== undefined ? (
            <Field.Root>
              <Field.Label>API Base URL</Field.Label>
              <Input.Root size="sm">
                <Input.Field
                  required
                  type="url"
                  disabled={saving}
                  value={endpointDraft}
                  onValueChange={setEndpointDraft}
                />
              </Input.Root>
            </Field.Root>
          ) : null}
        </div>
        <Button
          className={styles.save}
          type="submit"
          size="sm"
          disabled={
            saving ||
            (connected && !changed) ||
            (!connected && catalog.needsKey && !keyDraft.trim())
          }
          loading={saving}
        >
          {saving
            ? connected
              ? "Saving"
              : "Connecting"
            : connected
              ? "Save"
              : "Connect"}
        </Button>
      </form>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
