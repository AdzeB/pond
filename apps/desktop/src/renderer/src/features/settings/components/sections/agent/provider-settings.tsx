import { IconPlusOutline18 } from "@pond/icons/outline/18";
import { Menu, Settings } from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { gentleSpring } from "@/shared/lib/motion";
import styles from "./agent.module.css";
import { DefaultModels } from "./default-models";
import { ProviderLogo } from "./icons";
import { ProviderCard } from "./provider/provider";
import type { AgentPrefs, KeyRow } from "./types";

export function ProviderSettings({
  agent,
  keys,
  onPatchAgent,
  onRefresh,
}: {
  agent: AgentPrefs;
  keys: KeyRow[];
  onPatchAgent: (patch: Partial<AgentPrefs>) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const addRef = useRef<HTMLButtonElement>(null);
  const [drafts, setDrafts] = useState<AssistantProvider[]>([]);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : gentleSpring;
  const providers = ASSISTANT_MODELS.filter(
    (catalog) =>
      drafts.includes(catalog.id) ||
      keys.some((row) => row.provider === catalog.id && row.hasKey),
  );
  const available = ASSISTANT_MODELS.filter(
    (catalog) => !providers.includes(catalog),
  );
  return (
    <>
      <Settings.Section aria-label="Providers">
        <Settings.List className={styles.providers}>
          <div className={styles.sectionHeader}>
            <h2>Providers</h2>
            <p>Connect the AI providers you want to use.</p>
          </div>
          <div className={styles.providerBody}>
            <AnimatePresence initial={false}>
              {providers.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={transition}
                  className={styles.providerReveal}
                >
                  <Settings.Item>
                    <Settings.ItemDetails>
                      <Settings.ItemTitle>
                        No providers connected
                      </Settings.ItemTitle>
                      <Settings.ItemDescription>
                        Add a provider to choose the models Pond uses.
                      </Settings.ItemDescription>
                    </Settings.ItemDetails>
                  </Settings.Item>
                </motion.div>
              ) : (
                providers.map((catalog) => (
                  <motion.div
                    key={catalog.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={transition}
                    className={styles.providerReveal}
                  >
                    <ProviderCard
                      catalog={catalog}
                      row={keys.find((row) => row.provider === catalog.id)}
                      agent={agent}
                      onPatchAgent={onPatchAgent}
                      onRefresh={onRefresh}
                      onDismiss={() => {
                        setDrafts((current) =>
                          current.filter((id) => id !== catalog.id),
                        );
                        addRef.current?.focus();
                      }}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            <div className={styles.addProvider}>
              <Menu.Root>
                <Menu.Trigger
                  ref={addRef}
                  size="sm"
                  variant="secondary"
                  disabled={!available.length}
                >
                  <IconPlusOutline18 /> Add Provider
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner align="start">
                    <Menu.Popup>
                      {available.map((catalog) => (
                        <Menu.Item
                          key={catalog.id}
                          onClick={() =>
                            setDrafts((current) => [...current, catalog.id])
                          }
                        >
                          <ProviderLogo provider={catalog.id} />
                          {catalog.provider}
                        </Menu.Item>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </div>
          </div>
        </Settings.List>
      </Settings.Section>
      <DefaultModels agent={agent} keys={keys} onPatchAgent={onPatchAgent} />
    </>
  );
}
