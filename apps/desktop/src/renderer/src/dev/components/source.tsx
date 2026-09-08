import { Button } from "@pond/ui";
import { useEffect, useState } from "react";
import styles from "./components.module.css";

const uiFiles = import.meta.glob<string>(
  "../../../../../../../packages/ui/src/**/*.{ts,tsx,css}",
  { query: "?raw", import: "default" },
);
const themeFiles = import.meta.glob<string>(
  "../../../../../../../packages/theme/src/**/*.css",
  { query: "?raw", import: "default" },
);

export function ComponentSource({
  folder,
  pkg = "ui",
}: {
  folder: string;
  pkg?: "ui" | "theme";
}) {
  const files = pkg === "theme" ? themeFiles : uiFiles;
  const prefix = `../../../../../../../packages/${pkg}/src/${folder}/`;
  const options = Object.keys(files)
    .filter(
      (path) =>
        path.startsWith(prefix) &&
        !path.slice(prefix.length).includes("/") &&
        !path.includes(".test."),
    )
    .map((path) => {
      const filename = path.slice(prefix.length);
      const componentName = filename
        .replace(/\.(module\.css|tsx?|css)$/, "")
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return {
        order:
          filename === `${folder.split("/").at(-1)}.tsx` ||
          filename === "index.tsx"
            ? 0
            : filename.endsWith(".css")
              ? 2
              : 1,
        file: `${folder}/${filename}`,
        label:
          filename === "styles.module.css"
            ? "Styles"
            : filename === "index.ts"
              ? "Exports"
              : filename === "index.tsx"
                ? "Component"
                : `${componentName}${filename.endsWith(".css") ? " Styles" : ""}`,
      };
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  const [file, setFile] = useState(options[0]?.file ?? "");
  const [source, setSource] = useState("");
  const [error, setError] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const selectedFile = options.some((option) => option.file === file)
    ? file
    : (options[0]?.file ?? "");
  const path = `packages/${pkg}/src/${selectedFile}`;

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
  }, [files, path]);

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
              variant={selectedFile === value ? "tertiary" : "ghost"}
              aria-pressed={selectedFile === value}
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
            : source || "Loading source"}
        </code>
      </pre>
    </section>
  );
}
