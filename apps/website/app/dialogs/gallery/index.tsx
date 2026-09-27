"use client";

import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button, Checkbox, Dialog, Input, Select } from "@pond/ui";
import Link from "next/link";
import { useId, useState } from "react";
import dialogStyles from "../../../../../packages/ui/src/dialog/styles.module.css";
import {
  type DialogExample,
  dialogExamples,
  type PreviewField,
} from "./catalog";
import styles from "./styles.module.css";

const groups = ["All", ...new Set(dialogExamples.map((item) => item.group))];
const kinds = ["All", "custom", "prompt", "confirm"];

export function DialogGallery() {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("All");
  const [kind, setKind] = useState("All");
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DialogExample | null>(null);
  const query = search.trim().toLowerCase();
  const examples = dialogExamples.filter(
    (item) =>
      (group === "All" || item.group === group) &&
      (kind === "All" || item.kind === kind) &&
      `${item.title} ${item.description ?? ""} ${item.source}`
        .toLowerCase()
        .includes(query),
  );

  return (
    <main className={styles.page} data-dark={dark || undefined}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          pond <span>/ design</span>
        </Link>
        <span className={styles.eyebrow}>Component inventory</span>
      </header>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>The whole conversation</p>
          <h1>Dialogs, together.</h1>
          <p className={styles.summary}>
            Every dialog family in one place. Compare the details before
            changing them.
          </p>
        </div>
        <div className={styles.total}>
          <strong>{dialogExamples.length}</strong>
          <span>preview specimens</span>
        </div>
      </div>
      <div className={styles.toolbar}>
        <Input.Root size="lg" className={styles.search}>
          <Input.Field
            aria-label="Search dialogs"
            placeholder="Search dialogs or source files…"
            value={search}
            onValueChange={setSearch}
          />
        </Input.Root>
        <label className={styles.filter}>
          Area
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            {groups.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className={styles.filter}>
          Type
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            {kinds.map((value) => (
              <option key={value} value={value}>
                {value === "confirm"
                  ? "Confirmations"
                  : value === "prompt"
                    ? "Prompts"
                    : value === "custom"
                      ? "Custom dialogs"
                      : "All"}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="secondary"
          size="lg"
          aria-pressed={dark}
          onClick={() => setDark((value) => !value)}
        >
          {dark ? "Dark theme" : "Light theme"}
        </Button>
      </div>
      <div className={styles.legend}>
        <p role="status">
          Showing {examples.length} of {dialogExamples.length}
        </p>
        <p>
          Representative layouts · Shared UI controls · Sample data · No library
          actions
        </p>
      </div>
      {examples.length ? (
        <section className={styles.grid} aria-label="Dialog previews">
          {examples.map((example) => (
            <article className={styles.card} key={example.id} id={example.id}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.badge}>{example.group}</span>
                  <span className={styles.kind}>{example.kind}</span>
                </div>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setSelected(example);
                    setOpen(true);
                  }}
                  aria-label={`Inspect ${example.title}`}
                >
                  Inspect ↗
                </Button>
              </div>
              <div className={styles.stage}>
                <div
                  className={`${dialogStyles.popup} ${styles.specimen}`}
                  inert
                  style={{ maxWidth: example.width }}
                >
                  <DialogContents example={example} />
                </div>
              </div>
              <footer className={styles.caption}>
                <a href={`#${example.id}`}>{example.title}</a>
                <span>{example.width}px</span>
                <details>
                  <summary>Source</summary>
                  <code>apps/desktop/src/renderer/src/{example.source}</code>
                </details>
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.empty}>
          <h2>No matching dialogs</h2>
          <p>Try another title, source file, or area.</p>
          <Button
            onClick={() => {
              setSearch("");
              setGroup("All");
              setKind("All");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      <p className={styles.note}>
        Custom forms are reference fixtures, not live desktop components. Update
        the catalog alongside dialog changes. Native operating-system file
        pickers are not included.
      </p>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.backdrop} />
          {selected ? (
            <Dialog.Popup
              className={styles.expanded}
              style={{ width: selected.width }}
            >
              <DialogContents
                example={selected}
                onClose={() => setOpen(false)}
              />
              <p className={styles.previewNotice}>
                Preview only. Buttons close this example; no changes are saved.
              </p>
            </Dialog.Popup>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

function DialogContents({
  example,
  onClose,
}: {
  example: DialogExample;
  onClose?: () => void;
}) {
  const expanded = onClose !== undefined;
  return (
    <>
      <Dialog.Header>
        {expanded ? (
          <Dialog.Title>{example.title}</Dialog.Title>
        ) : (
          <h2 className={dialogStyles.title}>{example.title}</h2>
        )}
        {example.kind !== "confirm" ? (
          expanded ? (
            <Dialog.Close />
          ) : (
            <span className={dialogStyles.action} data-position="end">
              <IconXmarkOutline12 />
            </span>
          )
        ) : null}
      </Dialog.Header>
      <Dialog.Content>
        {example.description ? (
          expanded ? (
            <Dialog.Description>{example.description}</Dialog.Description>
          ) : (
            <p className={dialogStyles.description}>{example.description}</p>
          )
        ) : null}
        {example.fields?.map((field) => (
          <PreviewControl key={field.label} field={field} />
        ))}
        {example.visual ? <PreviewVisual visual={example.visual} /> : null}
        {example.secondaryFields?.map((field) => (
          <PreviewControl key={field.label} field={field} />
        ))}
        {example.rows ? (
          <div className={styles.rows}>
            {example.rows.map((row) => (
              <div key={row}>{row}</div>
            ))}
          </div>
        ) : null}
        {example.checks?.map((label) => (
          <PreviewCheck key={label} label={label} />
        ))}
        {example.notes?.map((note) => (
          <p key={note} className={styles.hint}>
            {note}
          </p>
        ))}
        {example.extra?.length ? (
          <div className={styles.extras}>
            {example.extra.map((label) => (
              <Button
                key={label}
                size="sm"
                variant="secondary"
                onClick={onClose}
              >
                {label}
              </Button>
            ))}
          </div>
        ) : null}
      </Dialog.Content>
      {example.confirm !== "" ? (
        <Dialog.Footer>
          {example.cancel !== "" ? (
            <Button variant="secondary" onClick={onClose}>
              {example.cancel ?? "Cancel"}
            </Button>
          ) : null}
          <Button
            variant={
              example.variant ??
              (example.kind === "confirm" ? "destructive" : "primary")
            }
            onClick={onClose}
          >
            {example.confirm ?? "Confirm"}
          </Button>
        </Dialog.Footer>
      ) : null}
    </>
  );
}

function PreviewControl({ field }: { field: PreviewField }) {
  const id = useId();
  if (field.options) {
    const items = field.options.map((label) => ({ value: label, label }));
    return (
      <Select.Root items={items} defaultValue={field.value}>
        <div className={styles.field}>
          <Select.Label>{field.label}</Select.Label>
          <Select.Trigger width="full">
            <Select.Value />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <Select.Items items={items} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    );
  }
  return (
    <div className={styles.field}>
      <label
        htmlFor={id}
        className={field.hiddenLabel ? styles.srOnly : undefined}
      >
        {field.label}
      </label>
      <Input.Root size="lg">
        {field.type === "textarea" ? (
          <Input.Textarea
            id={id}
            rows={4}
            defaultValue={field.value}
            placeholder={field.placeholder}
          />
        ) : (
          <Input.Field
            id={id}
            type={field.type ?? "text"}
            defaultValue={field.value}
            placeholder={field.placeholder}
            autoComplete="off"
          />
        )}
      </Input.Root>
    </div>
  );
}

function PreviewCheck({ label }: { label: string }) {
  const id = useId();
  return (
    <div className={styles.check}>
      <Checkbox.Root id={id}>
        <Checkbox.Indicator />
      </Checkbox.Root>
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

function PreviewVisual({
  visual,
}: {
  visual: NonNullable<DialogExample["visual"]>;
}) {
  if (visual === "folder")
    return (
      <>
        <p className={styles.hint}>Icon</p>
        <div className={styles.options}>
          {["Folder", "Heart", "Star", "Bookmark", "Image", "Music"].map(
            (label) => (
              <Button key={label} variant="tertiary" size="sm">
                {label}
              </Button>
            ),
          )}
        </div>
        <p className={styles.hint}>Color</p>
        <div className={styles.swatches}>
          {["gray", "red", "orange", "yellow", "green", "blue", "purple"].map(
            (color) => (
              <span
                key={color}
                title={color}
                style={{ background: `var(--ds-${color}-9)` }}
              />
            ),
          )}
        </div>
      </>
    );
  if (visual === "rules")
    return (
      <div className={styles.rows}>
        <div>
          Match <strong>all</strong> of the following rules
        </div>
        <div>
          Type <span>is</span> Image
        </div>
        <div>
          Rating <span>is at least</span> ★★★
        </div>
        <div>+ Add Rule</div>
      </div>
    );
  if (visual === "connection")
    return <div className={styles.connection}>𝕏</div>;
  if (visual === "watch") return <div className={styles.watch}>◎</div>;
  return (
    <div className={visual === "duplicates" ? styles.mediaPair : styles.media}>
      <div className={styles.artwork} />
      {visual === "duplicates" ? <div className={styles.artwork} /> : null}
    </div>
  );
}
