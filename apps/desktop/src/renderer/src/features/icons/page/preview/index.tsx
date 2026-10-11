import type { IconComponent, IconStyle } from "@pond/icons/types";
import { Button, Input } from "@pond/ui";
import styles from "./styles.module.css";

export interface GlyphEntry {
  glyph: string;
  style: IconStyle;
  name: string;
  Icon: IconComponent;
}

const SCALE = [12, 16, 18, 24, 32, 48] as const;

export function Preview({ entry }: { entry: GlyphEntry }) {
  const { Icon, name } = entry;
  return (
    <section className={styles.preview} aria-label={`${name} preview`}>
      <div className={styles.heading}>
        <code className={styles.name}>{name}</code>
        <Button
          type="button"
          size="xs"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(name);
          }}
        >
          Copy Name
        </Button>
      </div>
      <div className={styles.scale}>
        {SCALE.map((size) => (
          <figure className={styles.step} key={size}>
            <Icon size={size} />
            <figcaption className={styles.caption}>{size}</figcaption>
          </figure>
        ))}
      </div>
      <div className={styles.context}>
        <Button type="button" icon size="xs" variant="ghost" aria-label={name}>
          <Icon size={12} />
        </Button>
        <Button
          type="button"
          icon
          size="sm"
          variant="secondary"
          aria-label={name}
        >
          <Icon />
        </Button>
        <Button type="button" size="sm" variant="secondary">
          <Icon size={14} />
          Label
        </Button>
        <Button type="button" size="md" variant="primary">
          <Icon size={16} />
          Label
        </Button>
        <Input.Root size="sm" className={styles.field}>
          <Input.Icon>
            <Icon size={12} />
          </Input.Icon>
          <Input.Field aria-label="Sample field" placeholder="Search…" />
        </Input.Root>
        <p className={styles.inline}>
          <Icon size={14} />
          Inline with body text
        </p>
      </div>
    </section>
  );
}
