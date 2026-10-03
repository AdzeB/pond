import { IconPlusOutline18 } from "@pond/icons/outline/18";
import { Button, Input, Menu } from "@pond/ui";
import type { ScreenshotDraft } from "@shared/screenshot-capture";
import { useState } from "react";
import { RatingStars } from "@/features/saves/components/detail/rating";
import { TagMenu } from "@/features/tags/components/menu";
import styles from "./styles.module.css";
import { ScreenshotTags } from "./tags";

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
      <RatingStars
        value={value.rating || null}
        onChange={(rating) => onChange((current) => ({ ...current, rating }))}
      />
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
      <ScreenshotTags tags={value.tags} onRemove={toggleTag}>
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
      </ScreenshotTags>
    </fieldset>
  );
}
