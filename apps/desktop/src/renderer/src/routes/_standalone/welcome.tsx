import { Button, Collapsible, Field, Input, useToast } from "@pond/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NumberFieldStepper } from "@/components/_primitives/number-field-stepper";
import { Onboarding } from "@/components/onboarding";
import styles from "./welcome.module.css";

function Welcome() {
  const nav = useNavigate();
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [pairing, setPairing] = useState<string | null>(null);
  const [port, setPort] = useState<number>(41610);

  useEffect(() => {
    void (async () => {
      const t = (await window.pond.query("settings.ingestToken")) as {
        token: string | null;
      };
      setToken(t.token ?? null);
      if (t.token) {
        const url = new URL("pond://pair");
        url.searchParams.set("port", String(port));
        url.searchParams.set("token", t.token);
        setPairing(url.toString());
      }
    })();
  }, [port]);

  async function copy(text: string, what: string) {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `Copied ${what}`, type: "success" });
  }

  async function markOnboarded() {
    await window.pond.query("settings.markOnboarded", { value: true });
    void nav({ to: "/" });
  }

  return (
    <div className={styles.welcome}>
      <h2>Welcome to Pond</h2>
      <p className={styles.lead}>
        A local archive for the stuff you save. Everything lives on your
        machine: no cloud, no accounts.
      </p>

      <ol className={styles.steps}>
        <li>
          <h3>Pick where your library lives</h3>
          <p>
            Pond stores your saves on disk so you keep full control. Default is
            a folder in your home directory. Pick somewhere in iCloud Drive (or
            Dropbox, Google Drive…) if you want your saves to sync across
            machines.
          </p>
          <Onboarding.LibraryLocationStep />
        </li>

        <li>
          <h3>Install the browser extension</h3>
          <p>
            Install from the Chrome / Firefox store. If you're a developer, load{" "}
            <code>apps/extension</code> as an unpacked extension.
          </p>
        </li>

        <li>
          <h3>Pair it with this app</h3>
          <p>Click the Pond icon in your browser, paste the pairing link:</p>
          <Field.Root>
            <Field.Label className={styles["sr-only"]}>
              Pairing link
            </Field.Label>
            <div className={styles.row}>
              <Input.Field
                data-variant="code"
                readOnly
                value={pairing ?? "generating…"}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                disabled={!pairing}
                onClick={() => pairing && copy(pairing, "pairing link")}
              >
                Copy link
              </Button>
            </div>
          </Field.Root>

          <Collapsible.Root>
            <Collapsible.Trigger>Or copy token manually</Collapsible.Trigger>
            <Collapsible.Panel>
              <div className={styles["token-row"]}>
                <code>{token ?? "…"}</code>
                <Button
                  size="sm"
                  disabled={!token}
                  onClick={() => token && copy(token, "token")}
                >
                  Copy token
                </Button>
              </div>
              <p className={styles.hint}>
                Endpoint: <code>http://127.0.0.1:{port}/api/v2/item/add</code>
              </p>
              <Field.Root>
                <Field.Label>Port</Field.Label>
                <NumberFieldStepper
                  value={port}
                  onValueChange={(v) => setPort(v ?? 41610)}
                  min={1024}
                  max={65535}
                />
                <Field.Description>
                  Change only if 41610 is taken on your machine.
                </Field.Description>
              </Field.Root>
            </Collapsible.Panel>
          </Collapsible.Root>
        </li>

        <li>
          <h3>Save something</h3>
          <p>
            Right-click any page and pick "Save this page to Pond". It'll appear
            in your library within a second.
          </p>
        </li>

        <li>
          <h3>Sync your connected apps</h3>
          <p>
            Already have bookmarks elsewhere? Connect an app from{" "}
            <strong>Settings → Connected Apps</strong> and Pond will scrape your
            full history into the local library.
          </p>
          <Onboarding.SyncPanel />
        </li>
      </ol>

      <div className={styles.done}>
        <Button variant="primary" size="lg" onClick={markOnboarded}>
          I'm set up → Open library
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_standalone/welcome")({
  component: Welcome,
});
