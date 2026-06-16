import { IconDotsFill18 as Dots } from "@pond/icons/fill/18";
import { IconXmarkOutline18 as X } from "@pond/icons/outline/18";
import { Button, Dialog, Field, Input, Popover } from "@pond/ui";
import { useMemo, useState } from "react";
import { type Pond, usePonds } from "@/hooks/use-ponds";
import { initials } from "@/lib/initials";
import { DEFAULT_POND_COLOR, POND_COLORS } from "@/lib/pond-colors";
import {
  pondCustomise,
  usePondCustomiseOpen,
  usePondCustomiseTarget,
} from "@/stores/pond-customise";
import styles from "./styles.module.css";

const QUICK_EMOJI = ["🌊", "📦", "🎨", "🎬", "📚", "⭐️", "❤️", "🔥"];

export function PondCustomiseDialog() {
  const open = usePondCustomiseOpen();
  const targetPath = usePondCustomiseTarget();
  const { ponds, active } = usePonds();

  const target = useMemo(() => {
    if (targetPath) return ponds.find((p) => p.path === targetPath) ?? null;
    return active ?? null;
  }, [ponds, active, targetPath]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) pondCustomise.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open && target ? (
          <PondCustomiseContent key={target.path} pond={target} />
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PondCustomiseContent({ pond }: { pond: Pond }) {
  const { setDetails, savingDetails } = usePonds();
  const [name, setName] = useState(pond.name);
  const [avatar, setAvatar] = useState<string | null>(pond.avatar);
  const [color, setColor] = useState(pond.color ?? DEFAULT_POND_COLOR);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const glyph = avatar ?? initials(name);

  async function save() {
    await setDetails({ path: pond.path, name, avatar, color });
    pondCustomise.close();
  }

  return (
    <Dialog.Popup className={styles.popup}>
      <header className={styles.header}>
        <Dialog.Title className={styles.title}>Edit details</Dialog.Title>
        <Dialog.Close
          render={<Button icon size="sm" variant="ghost" aria-label="Close" />}
        >
          <X />
        </Dialog.Close>
      </header>

      <div className={styles.card}>
        <div className={styles.previewWrap}>
          <div
            className={styles.preview}
            style={{ background: color }}
            data-emoji={avatar ? true : undefined}
          >
            {glyph}
          </div>

          <Popover.Root open={emojiOpen} onOpenChange={setEmojiOpen}>
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
                  <div className={styles.emojiGrid}>
                    {QUICK_EMOJI.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={styles.emojiOption}
                        onClick={() => {
                          setAvatar(emoji);
                          setEmojiOpen(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <Input.Field
                    data-size="sm"
                    placeholder="Type or paste an emoji"
                    defaultValue={avatar ?? ""}
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
                      setEmojiOpen(false);
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
          autoFocus
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
    </Dialog.Popup>
  );
}
