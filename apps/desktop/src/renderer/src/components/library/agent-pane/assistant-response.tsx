import type { AssistantSource } from "@shared/assistant";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./assistant-response.module.css";
import { CodeBlock } from "./code-block";
import { remarkSaveCitations } from "./remark-save-citations";
import { SavePreview } from "./save-preview";

export function safeResponseUrl(url: string): string {
  if (/^#save-[1-9]\d*$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      !parsed.username &&
      !parsed.password
    )
      return parsed.href;
  } catch {}
  return "";
}

export function AssistantResponse({
  content,
  sources = [],
  onOpenSave,
  onAttach,
}: {
  content: string;
  sources?: AssistantSource[];
  onOpenSave: (id: string) => void;
  onAttach?: (sources: AssistantSource[]) => void;
}) {
  return (
    <div className={styles.response}>
      <Markdown
        remarkPlugins={[
          remarkGfm,
          [remarkSaveCitations, { count: sources.length, source: content }],
        ]}
        skipHtml
        urlTransform={safeResponseUrl}
        components={{
          img: () => null,
          a: ({ href, children }) => {
            const reference = /^#save-([1-9]\d*)$/.exec(href ?? "");
            if (reference) {
              const save = sources[Number(reference[1]) - 1];
              return save ? (
                <SavePreview
                  source={save}
                  reference={Number(reference[1])}
                  compact={children === String(Number(reference[1]))}
                  onOpenSave={onOpenSave}
                  onAttach={onAttach}
                />
              ) : (
                <span>{children}</span>
              );
            }
            return href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          pre: ({ node, children }) => {
            const code = node?.children.find(
              (child) => child.type === "element" && child.tagName === "code",
            );
            if (code?.type !== "element") return <pre>{children}</pre>;
            const value = code.children
              .flatMap((child) => (child.type === "text" ? child.value : []))
              .join("");
            const classes = code.properties.className;
            const language = Array.isArray(classes)
              ? String(
                  classes.find((name) =>
                    String(name).startsWith("language-"),
                  ) ?? "",
                ).replace(/^language-/, "")
              : "";
            return <CodeBlock code={value} language={language} />;
          },
          table: ({ children }) => (
            <section
              className={styles.table}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll wide tables in the side pane.
              tabIndex={0}
              aria-label="Response table"
            >
              <table>{children}</table>
            </section>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
