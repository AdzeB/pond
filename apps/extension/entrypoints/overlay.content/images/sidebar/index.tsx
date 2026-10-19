import { IconMagnifier } from "@pond/icons";
import { Button } from "@pond/ui/button";
import { Checkbox } from "@pond/ui/checkbox";
import { Input } from "@pond/ui/input";
import { type ReactNode, useId } from "react";
import { Targets } from "@/components/targets";
import type { LibraryTargets } from "@/utils/messaging";
import {
  type FacetCount,
  type ImageFilters,
  MAX_IMAGES,
  SIZE_BUCKETS,
  type SizeBucket,
} from "../discover";
import styles from "./styles.module.css";

const MAX_DOMAINS = 8;

interface SidebarProps {
  filters: ImageFilters;
  onFiltersChange: (filters: ImageFilters) => void;
  sizes: FacetCount[];
  formats: FacetCount[];
  domains: FacetCount[];
  library: LibraryTargets;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  folderIds: string[];
  onFolderIdsChange: (folderIds: string[]) => void;
  container: HTMLElement;
  count: number;
  onSave: () => void;
}

function toggled<T>(set: ReadonlySet<T>, value: T, on: boolean): Set<T> {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>{title}</h3>
      {children}
    </section>
  );
}

interface FacetProps {
  label: string;
  count: FacetCount | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function Facet({ label, count, checked, onCheckedChange }: FacetProps) {
  const id = useId();
  return (
    <label className={styles.facet} htmlFor={id}>
      <Checkbox.Root
        id={id}
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
      >
        <Checkbox.Indicator />
      </Checkbox.Root>
      <span className={styles.label}>{label}</span>
      <span className={styles.count}>
        {count ? `${count.selected}/${count.total}` : "0"}
      </span>
    </label>
  );
}

function MinimumField({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <Input.Root size="sm" className={styles.minimum}>
      <Input.Prefix>{label.slice(0, 1)}</Input.Prefix>
      <Input.Field
        aria-label={`Minimum ${label.toLowerCase()}`}
        inputMode="numeric"
        placeholder="0"
        value={value ? String(value) : ""}
        onChange={(event) => {
          const next = Number.parseInt(
            event.target.value.replace(/\D/g, ""),
            10,
          );
          onValueChange(Number.isFinite(next) ? Math.min(next, 100_000) : 0);
        }}
      />
    </Input.Root>
  );
}

export function Sidebar({
  filters,
  onFiltersChange,
  sizes,
  formats,
  domains,
  library,
  tags,
  onTagsChange,
  folderIds,
  onFolderIdsChange,
  container,
  count,
  onSave,
}: SidebarProps) {
  const set = (change: Partial<ImageFilters>) =>
    onFiltersChange({ ...filters, ...change });
  const sizeCounts = new Map(sizes.map((size) => [size.id, size]));
  const over = count > MAX_IMAGES;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.scroll}>
        <Input.Root size="sm">
          <Input.Icon>
            <IconMagnifier size={12} />
          </Input.Icon>
          <Input.Field
            aria-label="Search images"
            placeholder="Search images…"
            value={filters.query}
            onChange={(event) => set({ query: event.target.value })}
          />
        </Input.Root>

        <Section title="Size">
          {SIZE_BUCKETS.map((bucket) => (
            <Facet
              key={bucket.id}
              label={bucket.label}
              count={sizeCounts.get(bucket.id)}
              checked={filters.sizes.has(bucket.id)}
              onCheckedChange={(on) =>
                set({
                  sizes: toggled<SizeBucket>(filters.sizes, bucket.id, on),
                })
              }
            />
          ))}
          <div className={styles.minimums}>
            <MinimumField
              label="Width"
              value={filters.minWidth}
              onValueChange={(minWidth) => set({ minWidth })}
            />
            <MinimumField
              label="Height"
              value={filters.minHeight}
              onValueChange={(minHeight) => set({ minHeight })}
            />
          </div>
        </Section>

        {formats.length > 1 ? (
          <Section title="Format">
            {formats.map((format) => (
              <Facet
                key={format.id}
                label={format.id}
                count={format}
                checked={!filters.hiddenFormats.has(format.id)}
                onCheckedChange={(on) =>
                  set({
                    hiddenFormats: toggled(
                      filters.hiddenFormats,
                      format.id,
                      !on,
                    ),
                  })
                }
              />
            ))}
          </Section>
        ) : null}

        {domains.length > 1 ? (
          <Section title="Domain">
            {domains.slice(0, MAX_DOMAINS).map((domain) => (
              <Facet
                key={domain.id}
                label={domain.id}
                count={domain}
                checked={!filters.hiddenDomains.has(domain.id)}
                onCheckedChange={(on) =>
                  set({
                    hiddenDomains: toggled(
                      filters.hiddenDomains,
                      domain.id,
                      !on,
                    ),
                  })
                }
              />
            ))}
          </Section>
        ) : null}

        <Section title="Tags">
          <Targets.Tags
            tags={library.tags}
            recent={library.recentTags}
            value={tags}
            onValueChange={onTagsChange}
            container={container}
          />
        </Section>

        {library.folders.length > 0 ? (
          <Section title="Folders">
            <Targets.Folders
              className={styles.folders}
              folders={library.folders}
              recentIds={library.recentFolderIds}
              value={folderIds}
              onValueChange={onFolderIdsChange}
            />
          </Section>
        ) : null}
      </div>

      <footer className={styles.footer}>
        {over ? (
          <p className={styles.limit} role="status">
            Pick up to {MAX_IMAGES} images at a time.
          </p>
        ) : null}
        <Button
          variant="primary"
          width="full"
          disabled={count === 0 || over}
          onClick={onSave}
        >
          {count === 1 ? "Save 1 Image" : `Save ${count} Images`}
        </Button>
      </footer>
    </aside>
  );
}
