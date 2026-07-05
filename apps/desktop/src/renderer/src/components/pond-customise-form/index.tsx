import { IconDotsFill18 as Dots } from "@pond/icons/fill/18";
import { Button, Field, Input, Popover } from "@pond/ui";
import { useState } from "react";
import { type Pond, usePonds } from "@/hooks/use-ponds";
import { DEFAULT_POND_COLOR, POND_COLORS } from "@/lib/ui/pond-colors";
import {
  glyphKind,
  iconAvatar,
  POND_ICONS,
  PondGlyph,
  resolvePondIcon,
} from "@/lib/ui/pond-icons";
import styles from "./styles.module.css";

const QUICK_EMOJI = ["🌊", "📦", "🎨", "🎬", "📚", "⭐️", "❤️", "🔥"];

interface PondCustomiseFormProps {
  pond: Pond;
  // Called after a successful save (e.g. to close a hosting dialog).
  onSaved?: () => void;
  autoFocusName?: boolean;
}

export function PondCustomiseForm({
  pond,
  onSaved,
  autoFocusName,
}: PondCustomiseFormProps) {
  const { setDetails, savingDetails } = usePonds();
  const [name, setName] = useState(pond.name);
  const [avatar, setAvatar] = useState<string | null>(pond.avatar);
  const [color, setColor] = useState(pond.color ?? DEFAULT_POND_COLOR);
  const [pickerOpen, setPickerOpen] = useState(false);

  const kind = glyphKind(avatar);
  const selectedIconKey = resolvePondIcon(avatar)?.key ?? null;

  async function save() {
    await setDetails({ path: pond.path, name, avatar, color });
    onSaved?.();
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.previewWrap}>
          <div
            className={styles.preview}
            style={{ background: color }}
            data-emoji={kind === "emoji" ? true : undefined}
            data-icon={kind === "icon" ? true : undefined}
          >
            <PondGlyph avatar={avatar} name={name} iconSize={48} />
          </div>

          <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
            <Popover.Trigger
              render={
                <button
                  type="button"
                  className={styles.glyphButton}
                  aria-label="Change icon"
                />
              }
            >
              <Dots />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="bottom" align="center">
                <Popover.Popup className={styles.emojiPopup}>
                  <div className={styles.iconGrid}>
                    {POND_ICONS.map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        className={styles.iconOption}
                        data-selected={key === selectedIconKey || undefined}
                        aria-label={label}
                        aria-pressed={key === selectedIconKey}
                        onClick={() => setAvatar(iconAvatar(key))}
                      >
                        <Icon width={20} height={20} aria-hidden />
                      </button>
                    ))}
                  </div>
                  <div className={styles.emojiGrid}>
                    {QUICK_EMOJI.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={styles.emojiOption}
                        onClick={() => setAvatar(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <Input.Field
                    data-size="sm"
                    placeholder="Type or paste an emoji"
                    defaultValue={kind === "emoji" ? (avatar ?? "") : ""}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setAvatar(value.length > 0 ? value : null);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className={styles.clearEmoji}
                    onClick={() => {
                      setAvatar(null);
                      setPickerOpen(false);
                    }}
                  >
                    Use initials
                  </Button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>

        <div className={styles.swatches}>
          {POND_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={styles.swatch}
              style={{ background: swatch, color: swatch }}
              data-selected={swatch === color || undefined}
              aria-label={`Color ${swatch}`}
              aria-pressed={swatch === color}
              onClick={() => setColor(swatch)}
            />
          ))}
        </div>
      </div>

      <Field.Root className={styles.field}>
        <Field.Label>Library name</Field.Label>
        <Input.Field
          value={name}
          autoFocus={autoFocusName}
          placeholder="Library name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
        />
      </Field.Root>

      <Button
        variant="primary"
        className={styles.save}
        disabled={savingDetails}
        onClick={() => void save()}
      >
        Save
      </Button>
    </>
  );
}
