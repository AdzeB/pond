import { IconChevronLeftOutline12 } from "@pond/icons/outline/12";
import { Button, Input, Logo, Tooltip } from "@pond/ui";
import { Component, type ReactNode, useState } from "react";
import { componentGroups, components } from "./catalog";
import { Choice } from "./choice";
import styles from "./components.module.css";
import { ComponentExample } from "./examples";
import { ComponentSource } from "./source";

interface PreviewState {
  error: string | null;
}

class PreviewBoundary extends Component<{ children: ReactNode }, PreviewState> {
  state: PreviewState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className={styles.previewError}>
          This example couldn’t render. Fix the component, then reset the
          preview.<pre>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ComponentsPage({
  component = "Button",
  onSelect,
  onExit,
}: {
  component?: string;
  onSelect: (component: string) => void;
  onExit?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [width, setWidth] = useState<"Fill" | "640 px" | "320 px">("Fill");
  const [showSource, setShowSource] = useState(false);
  const entry =
    components.find((entry) => entry.id === component) ?? components[0];
  const filter = query.trim().toLowerCase();
  const visible = components.filter((entry) =>
    `${entry.id} ${entry.group} ${entry.description}`
      .toLowerCase()
      .includes(filter),
  );
  if (!entry) return null;
  const isTheme = entry.group === "Theme";

  return (
    <Tooltip.Provider>
      <div className={styles.root} data-component-gallery>
        <header className={styles.header}>
          {onExit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onExit}
              aria-label="Back to library"
            >
              <IconChevronLeftOutline12 />
              Library
            </Button>
          )}
          <div className={styles.identity}>
            <Logo size={16} />
            <span>Components</span>
            <span className={styles.badge}>{components.length}</span>
          </div>
          <span className={styles.headerNote}>Live from @pond/ui</span>
        </header>
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <div className={styles.search}>
              <Input.Root size="sm">
                <Input.Field
                  type="search"
                  aria-label="Find a component"
                  placeholder="Find a component…"
                  value={query}
                  onValueChange={setQuery}
                />
              </Input.Root>
            </div>
            <nav className={styles.navigation} aria-label="Components">
              {componentGroups.map(([group]) => {
                const entries = visible.filter(
                  (entry) => entry.group === group,
                );
                if (!entries.length) return null;
                return (
                  <section key={group} className={styles.group}>
                    <h2>{group}</h2>
                    {entries.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.navItem}
                        aria-current={entry.id === item.id ? "page" : undefined}
                        onClick={() => onSelect(item.id)}
                      >
                        {item.id}
                      </button>
                    ))}
                  </section>
                );
              })}
              {!visible.length && (
                <div className={styles.noResults}>
                  <p>No components found.</p>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setQuery("")}
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </nav>
            <div className={styles.sidebarFooter}>
              Local examples only.
              <br />
              Your library stays unchanged.
            </div>
          </aside>
          <main className={styles.main} data-scroll-viewport>
            <div className={styles.content} data-wide={isTheme || undefined}>
              <div className={styles.intro}>
                <span className={styles.eyebrow}>{entry.group}</span>
                <h1>{entry.id}</h1>
                <p>{entry.description}</p>
                <code>
                  {isTheme
                    ? `packages/theme/src/${entry.folder}/`
                    : `packages/ui/src/${entry.folder}/`}
                </code>
              </div>
              <section
                className={styles.preview}
                data-layout={isTheme ? "tokens" : undefined}
                aria-label={`${entry.id} preview`}
              >
                <div className={styles.previewHeader}>
                  <span>Preview</span>
                  <div className={styles.actions}>
                    {isTheme ? null : (
                      <Choice
                        label="Preview width"
                        value={width}
                        values={["Fill", "640 px", "320 px"]}
                        onChange={setWidth}
                      />
                    )}
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setRevision((revision) => revision + 1)}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <div className={styles.stage}>
                  <div
                    className={styles.example}
                    style={{
                      width:
                        isTheme || width === "Fill"
                          ? "100%"
                          : width === "640 px"
                            ? 640
                            : 320,
                    }}
                  >
                    <PreviewBoundary key={`${entry.id}-${revision}`}>
                      <ComponentExample entry={entry} />
                    </PreviewBoundary>
                  </div>
                </div>
              </section>
              <div className={styles.sourceToggle}>
                <p>
                  {isTheme
                    ? "Copy CSS from the preview, then paste it into the token file."
                    : "Edit the shared component or its stylesheet to update this preview and the app."}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  aria-expanded={showSource}
                  aria-controls="gallery-source"
                  onClick={() => setShowSource((show) => !show)}
                >
                  {showSource ? "Hide source" : "View source"}
                </Button>
              </div>
              <div id="gallery-source">
                {showSource && (
                  <ComponentSource
                    key={entry.id}
                    folder={entry.folder}
                    pkg={isTheme ? "theme" : "ui"}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
