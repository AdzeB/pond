import { Button } from "@pond/ui";
import { useEffect, useState } from "react";
import styles from "./components.module.css";

const files = import.meta.glob<string>(
  "../../../../../../../packages/ui/src/**/{index.tsx,data-table.tsx,dialog.tsx,styles.module.css}",
  { query: "?raw", import: "default" },
);

export function ComponentSource({ folder }: { folder: string }) {
  const options = [
    {
      label: "Styles",
      file: `${folder}/styles.module.css`,
    },
    {
      label: "Component",
      file: `${folder}/${folder === "data-table" ? "data-table.tsx" : folder === "dialog" ? "dialog.tsx" : "index.tsx"}`,
    },
  ].filter(({ file }) => files[`../../../../../../../packages/ui/src/${file}`]);
  const [file, setFile] = useState(options[0]?.file ?? "");
  const [source, setSource] = useState("");
  const [error, setError] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const path = `packages/ui/src/${file}`;

  useEffect(() => {
    let active = true;
    setSource("");
    setError(false);
    setCopyStatus("");
    const load = files[`../../../../../../../${path}`];
    if (!load) {
      setError(true);
      return;
    }
    load().then(
      (text) => {
        if (active) setSource(text);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [path]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Couldn’t copy. Select the text to copy it manually.");
    }
  }

  return (
    <section className={styles.source} aria-label="Component source">
      <div className={styles.sourceHeader}>
        <div className={styles.actions}>
          {options.map(({ file: value, label }) => (
            <Button
              key={value}
              size="xs"
              variant={file === value ? "tertiary" : "ghost"}
              aria-pressed={file === value}
              onClick={() => setFile(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className={styles.actions}>
          <Button size="xs" variant="ghost" onClick={() => void copy(path)}>
            Copy path
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={!source}
            onClick={() => void copy(source)}
          >
            Copy code
          </Button>
        </div>
      </div>
      <div className={styles.sourcePath}>
        <code>{path}</code>
        <span role="status">{copyStatus}</span>
      </div>
      <pre>
        <code>
          {error
            ? "Source unavailable. Open the file at the path above."
            : source || "Loading source…"}
        </code>
      </pre>
    </section>
  );
}
