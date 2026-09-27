import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { IconPlusOutline18, IconStarOutline18 } from "@pond/icons/outline/18";
import { Button, Input, Menu } from "@pond/ui";
import type { ScreenshotDraft } from "@shared/screenshot-capture";
import { useState } from "react";
import { TagMenu } from "@/features/tags/components/menu";
import styles from "./styles.module.css";

export interface ScreenshotDetails {
  title: string;
  notes: string;
  tags: string[];
  rating: number;
}

export function ScreenshotDetailsFields({
  draft,
  value,
  onChange,
  disabled,
}: {
  draft: ScreenshotDraft;
  value: ScreenshotDetails;
  onChange(update: (current: ScreenshotDetails) => ScreenshotDetails): void;
  disabled: boolean;
}) {
  const [tagsOpen, setTagsOpen] = useState(false);
  const appliedKeys = new Set(value.tags.map((tag) => tag.toLowerCase()));
  function toggleTag(name: string) {
    onChange((current) => ({
      ...current,
      tags: current.tags.some((tag) => tag.toLowerCase() === name.toLowerCase())
        ? current.tags.filter((tag) => tag.toLowerCase() !== name.toLowerCase())
        : [...current.tags, name],
    }));
  }
  return (
    <fieldset
      className={styles.root}
      disabled={disabled}
      aria-label="Screenshot details"
    >
      <figure className={styles.preview}>
        <img src={draft.preview} alt="Screenshot preview" />
        <figcaption>
          {draft.width} × {draft.height}
        </figcaption>
      </figure>
      <fieldset className={styles.rating} aria-label="Screenshot rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <Button
            key={star}
            type="button"
            icon
            size="xs"
            variant="ghost"
            aria-label={`${star} ${star === 1 ? "Star" : "Stars"}`}
            aria-pressed={value.rating === star}
            data-active={star <= value.rating || undefined}
            className={styles.star}
            onClick={() =>
              onChange((current) => ({
                ...current,
                rating: current.rating === star ? 0 : star,
              }))
            }
          >
            <IconStarOutline18 />
          </Button>
        ))}
      </fieldset>
      <Input.Root size="sm" variant="secondary">
        <Input.Field
          aria-label="Screenshot Title"
          placeholder="Title"
          value={value.title}
          onValueChange={(title) =>
            onChange((current) => ({ ...current, title }))
          }
          maxLength={255}
        />
      </Input.Root>
      <Input.Root size="sm" variant="secondary">
        <Input.Textarea
          aria-label="Screenshot Notes"
          placeholder="Add notes"
          rows={3}
          value={value.notes}
          onValueChange={(notes) =>
            onChange((current) => ({ ...current, notes }))
          }
          maxLength={8192}
        />
      </Input.Root>
      <section className={styles.tags} aria-label="Screenshot tags">
        {value.tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            <span title={tag}>{tag}</span>
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => toggleTag(tag)}
            >
              <IconXmarkOutline12 />
            </button>
          </span>
        ))}
        <Menu.Root open={tagsOpen && !disabled} onOpenChange={setTagsOpen}>
          <Menu.Trigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                icon={value.tags.length > 0}
              />
            }
            aria-label="Add Tags"
            disabled={disabled}
          >
            <IconPlusOutline18 />
            {value.tags.length === 0 ? "Add Tags" : null}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="right" align="start" sideOffset={8}>
              <Menu.Popup>
                <Menu.Viewport>
                  <TagMenu
                    appliedKeys={appliedKeys}
                    onToggle={toggleTag}
                    allowCreate
                  />
                </Menu.Viewport>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </section>
    </fieldset>
  );
}
