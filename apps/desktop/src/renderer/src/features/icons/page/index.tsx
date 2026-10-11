import * as Icons from "@pond/icons";
import { manifest } from "@pond/icons/manifest";
import * as BrandIcons from "@pond/icons/social-media";
import type { IconComponent, IconStyle } from "@pond/icons/types";
import { Button, Empty, Input, Toggle, ToggleGroup } from "@pond/ui";
import { useDeferredValue, useState } from "react";
import { type GlyphEntry, Preview } from "./preview";
import styles from "./styles.module.css";

const SIZES = ["12", "16", "18", "24", "48"] as const;
type Size = (typeof SIZES)[number];
type StyleFilter = "all" | IconStyle;

const LIBRARY = new Map<string, IconComponent>(Object.entries(Icons));

const GLYPHS: GlyphEntry[] = Object.entries(manifest).flatMap(
  ([glyph, glyphStyles]) =>
    glyphStyles.flatMap((style) => {
      const name = `Icon${glyph}${style === "fill" ? "Fill" : ""}`;
      const Icon = LIBRARY.get(name);
      return Icon ? [{ glyph, style, name, Icon }] : [];
    }),
);

const BRANDS = Object.entries(BrandIcons).sort(([a], [b]) =>
  a.localeCompare(b),
);

export function IconGalleryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StyleFilter>("all");
  const [size, setSize] = useState<Size>("18");
  const [selected, setSelected] = useState<GlyphEntry | null>(null);
  const search = useDeferredValue(query.trim().toLowerCase());

  const visible = GLYPHS.filter(
    (entry) =>
      (filter === "all" || entry.style === filter) &&
      entry.name.toLowerCase().includes(search),
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Icon Gallery</h1>
        <p className={styles.summary}>
          {`${GLYPHS.length} icons drawn on one 18px grid. Pick one to see it in context.`}
        </p>
      </header>
      <div className={styles.toolbar}>
        <Input.Root size="sm" className={styles.search}>
          <Input.Icon>
            <Icons.IconMagnifier size={12} />
          </Input.Icon>
          <Input.Field
            aria-label="Search icons"
            placeholder="Search…"
            spellCheck={false}
            value={query}
            onValueChange={setQuery}
          />
        </Input.Root>
        <ToggleGroup
          aria-label="Style"
          value={[filter]}
          onValueChange={(value) => {
            const next = value[0];
            if (next === "all" || next === "outline" || next === "fill") {
              setFilter(next);
            }
          }}
        >
          <Toggle type="button" size="sm" value="all">
            All
          </Toggle>
          <Toggle type="button" size="sm" value="outline">
            Outline
          </Toggle>
          <Toggle type="button" size="sm" value="fill">
            Fill
          </Toggle>
        </ToggleGroup>
        <ToggleGroup
          aria-label="Size"
          value={[size]}
          onValueChange={(value) => {
            const next = SIZES.find((option) => option === value[0]);
            if (next) setSize(next);
          }}
        >
          {SIZES.map((option) => (
            <Toggle key={option} type="button" size="sm" value={option}>
              {option}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
      <div className={styles.scroll}>
        {selected ? <Preview entry={selected} /> : null}
        <section className={styles.group}>
          <h2 className={styles["group-title"]}>Pond Icons</h2>
          {visible.length > 0 ? (
            <div className={styles.grid} data-size={size}>
              {visible.map((entry) => (
                <Button
                  key={entry.name}
                  type="button"
                  variant="ghost"
                  width="full"
                  className={styles.tile}
                  aria-pressed={selected?.name === entry.name}
                  onClick={() => setSelected(entry)}
                >
                  <span className={styles.art}>
                    <entry.Icon size={Number(size)} />
                  </span>
                  <span className={styles.id}>{entry.name.slice(4)}</span>
                </Button>
              ))}
            </div>
          ) : (
            <Empty.Root>
              <Empty.Title>No results found</Empty.Title>
              <Empty.Description>
                Try a different name or style.
              </Empty.Description>
            </Empty.Root>
          )}
        </section>
        <section className={styles.group}>
          <h2 className={styles["group-title"]}>Brand Icons</h2>
          <div className={styles.brands}>
            {BRANDS.map(([name, Icon]) => (
              <figure className={styles.card} key={name}>
                <div className={styles.marks}>
                  <Icon width={48} height={48} />
                  <Icon width={18} height={18} />
                </div>
                <figcaption className={styles.id}>{name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
