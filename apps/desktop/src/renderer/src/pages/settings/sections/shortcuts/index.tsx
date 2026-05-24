import { Button, Input, useToast } from "@pond/ui";
import { useEffect, useMemo, useState } from "react";
import { SourceBadge } from "@/components/_primitives/source-badge";
import { Settings } from "@/components/settings";
import { usePrefs } from "@/pool/prefs";
import { ALL_SOURCES, SOURCE_DESCRIPTIONS } from "../_types";
import styles from "./styles.module.css";

const REPO_URL = "https://github.com/raphaelsalaja/pond";

export function ShortcutsSection() {
  const toast = useToast();
  const [apiPrefs] = usePrefs("api");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    void window.pond
      .query("settings.ingestToken", {})
      .then((t) => setToken((t as { token?: string }).token ?? null));
  }, []);

  const pairingLink = useMemo(() => {
    if (!token) return "";
    const u = new URL("pond://pair");
    u.searchParams.set("port", String(apiPrefs.port || 41610));
    u.searchParams.set("token", token);
    return u.toString();
  }, [token, apiPrefs.port]);

  function copyPairingLink() {
    if (!pairingLink) return;
    void navigator.clipboard.writeText(pairingLink);
    toast.add({ title: "Pairing link copied", type: "success" });
  }

  function openRepo() {
    void window.pond.openExternal(REPO_URL);
  }

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Browser Extension</Settings.Title>
        <Settings.Description>
          Save anything you find on the web straight to Pond.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>What it does</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item className={styles["info-row"]}>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Save the current tab</Settings.ItemTitle>
              <Settings.ItemDescription>
                Click the Pond icon in your browser to send any page into your
                library.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
          </Settings.Item>

          <Settings.Item className={styles["info-row"]}>
            <Settings.ItemDetails>
              <Settings.ItemTitle>
                Push your signed-in session
              </Settings.ItemTitle>
              <Settings.ItemDescription>
                For sites behind a login (Twitter, Instagram, TikTok and
                friends), the extension hands your cookies off so Pond can fetch
                what you already have access to.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
          </Settings.Item>

          <Settings.Item className={styles["info-row"]}>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Open Pond from any tab</Settings.ItemTitle>
              <Settings.ItemDescription>
                Quick links from the popup back to the library, search, and
                capture sheet.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Pair with Pond</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Pairing Link</Settings.ItemTitle>
              <Settings.ItemDescription>
                Open the Pond extension, paste this in, hit Pair.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Input.Field
                data-variant="code"
                data-size="sm"
                readOnly
                value={pairingLink}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                size="sm"
                disabled={!pairingLink}
                onClick={copyPairingLink}
              >
                Copy Link
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Supported Sites</Settings.SectionTitle>
        <Settings.List>
          {ALL_SOURCES.map((entry) => (
            <Settings.Item key={entry.id} className={styles["source-row"]}>
              <SourceBadge.Root source={entry.id} data-size="md" />
              <Settings.ItemDetails>
                <Settings.ItemTitle>{entry.label}</Settings.ItemTitle>
                <Settings.ItemDescription>
                  {SOURCE_DESCRIPTIONS[entry.id]}
                </Settings.ItemDescription>
              </Settings.ItemDetails>
            </Settings.Item>
          ))}
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Get the Extension</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Install Instructions</Settings.ItemTitle>
              <Settings.ItemDescription>
                Build from source. Store listings are on the way.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button size="sm" onClick={openRepo}>
                Open Repo
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}
