"use client";

import { Button, Checkbox, Dialog, Input, Select } from "@pond/ui";
import Link from "next/link";
import { useId, useState } from "react";
import { Card } from "./card";
import {
  type DialogExample,
  dialogExamples,
  type PreviewField,
} from "./catalog";
import styles from "./styles.module.css";

const groups = [
  "All",
  ...new Set(dialogExamples.map((item) => item.group)),
].map((value) => ({ value, label: value }));
const kinds = [
  { value: "All", label: "All" },
  { value: "custom", label: "Custom dialogs" },
  { value: "prompt", label: "Prompts" },
  { value: "confirm", label: "Confirmations" },
];

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
        <Link href="/dialogs/onboarding" className={styles.eyebrow}>
          Onboarding
        </Link>
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
        <FilterSelect
          label="Area"
          items={groups}
          value={group}
          onValueChange={setGroup}
        />
        <FilterSelect
          label="Type"
          items={kinds}
          value={kind}
          onValueChange={setKind}
        />
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
            <Card
              key={example.id}
              example={example}
              onInspect={() => {
                setSelected(example);
                setOpen(true);
              }}
            >
              <DialogContents example={example} />
            </Card>
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
        These cards are layout samples. Open Dialog Gallery in Pond to see the
        live dialogs. Native operating-system file pickers are not included.
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
  return (
    <>
      <Dialog.Header>
        <Dialog.Title>{example.title}</Dialog.Title>
      </Dialog.Header>
      <Dialog.Content>
        {example.description ? (
          <Dialog.Description>{example.description}</Dialog.Description>
        ) : null}
        {example.fields?.map((field) => (
          <PreviewControl key={field.label} field={field} />
        ))}
        {example.visual ? <PreviewVisual visual={example.visual} /> : null}
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

function FilterSelect({
  label,
  items,
  value,
  onValueChange,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <div className={styles.filter}>
        <Select.Label>{label}</Select.Label>
        <Select.Trigger size="lg">
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
        className={field.hiddenLabel ? styles["sr-only"] : undefined}
      >
        {field.label}
      </label>
      <Input.Root size="md">
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
    <div
      className={styles.media}
      data-pair={visual === "duplicates" || undefined}
    >
      <div className={styles.artwork} />
      {visual === "duplicates" ? <div className={styles.artwork} /> : null}
    </div>
  );
}
