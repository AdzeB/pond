import {
  IconBarsFilterOutline18,
  IconEyeOutline18,
  IconMagnifierOutline18,
  IconMinusOutline18,
  IconPlusOutline18,
} from "@pond/icons/outline/18";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { readQuery, writeQuery } from "@pond/schema/filters/url";
import { Button, cn, Menu, Tooltip } from "@pond/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AddCommitApi,
  appendPredicate,
  replacePredicate,
} from "@/components/filter-bar/helpers";
import {
  AddFilterMenu,
  useFilterHotkey,
  useSearchHotkey,
} from "@/components/filter-bar/registry";
import { ViewPicker } from "@/components/layout-popover";
import { usePlatform } from "@/lib/platform";
import { useSidebar } from "@/lib/use-sidebar";
import styles from "./styles.module.css";

const SEARCH_DEBOUNCE_MS = 150;

function Root() {
  const [params, setParams] = useSearchParams();
  const [zoom, setZoom] = useZoom();

  const urlSearch = params.get("q") ?? "";
  const [search, setSearchLocal] = useState(urlSearch);
  useEffect(() => {
    setSearchLocal(urlSearch);
  }, [urlSearch]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setSearchLocal(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            if (next) p.set("q", next);
            else p.delete("q");
            return p;
          },
          { replace: true },
        );
      }, SEARCH_DEBOUNCE_MS);
    },
    [setParams],
  );

  const [filterOpen, setFilterOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const addApi = useMemo<AddCommitApi>(() => {
    const baseFromCurrent = () => {
      const current = readQuery(params);
      return current.kind === "and" ? current : EMPTY_QUERY;
    };
    return {
      commitOne: (predicate) => {
        const base = baseFromCurrent();
        setParams(writeQuery(params, appendPredicate(base, predicate)), {
          replace: true,
        });
      },
      liveAdd: (predicate) => {
        const base = baseFromCurrent();
        setParams(writeQuery(params, appendPredicate(base, predicate)), {
          replace: true,
        });
        return base.clauses.length;
      },
      liveUpdate: (idx, predicate) => {
        const base = baseFromCurrent();
        setParams(writeQuery(params, replacePredicate(base, idx, predicate)), {
          replace: true,
        });
      },
    };
  }, [params, setParams]);

  useFilterHotkey(() => {
    setFilterOpen(true);
    requestAnimationFrame(() => filterInputRef.current?.focus());
  });

  useSearchHotkey(() => {
    const el = searchInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  });

  return (
    <Toolbar>
      <Search>
        <SearchIcon>
          <IconMagnifierOutline18 />
        </SearchIcon>
        <SearchInput
          ref={searchInputRef}
          type="search"
          placeholder="Search"
          value={search}
          onChange={onSearchChange}
          aria-label="Search saves"
        />
      </Search>

      <Right>
        <ZoomControls value={zoom} onChange={setZoom} />
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <ViewPicker.Root
                trigger={
                  <Button
                    icon
                    variant="ghost"
                    size="xs"
                    aria-label="View options"
                  >
                    <IconEyeOutline18 />
                  </Button>
                }
              />
            }
          />
          <Tooltip.Portal>
            <Tooltip.Positioner side="bottom">
              <Tooltip.Popup>View options</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        <Menu.Root open={filterOpen} onOpenChange={setFilterOpen}>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Menu.Trigger
                  render={
                    <Button
                      icon
                      variant="ghost"
                      size="xs"
                      aria-label="Add filter"
                    >
                      <IconBarsFilterOutline18 />
                    </Button>
                  }
                />
              }
            />
            <Tooltip.Portal>
              <Tooltip.Positioner side="bottom">
                <Tooltip.Popup>Add filter</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6}>
              <Menu.Popup>
                <AddFilterMenu api={addApi} inputRef={filterInputRef} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </Right>
    </Toolbar>
  );
}

interface ToolbarProps extends React.ComponentPropsWithoutRef<"div"> {}

function Toolbar({ className, style, ...props }: ToolbarProps) {
  const { open: sidebarOpen } = useSidebar();
  const platform = usePlatform();
  const trafficLightInset = platform === "mac" && !sidebarOpen ? 72 : 0;

  return (
    <div
      role="toolbar"
      aria-label="Library toolbar"
      className={cn(styles.toolbar, className)}
      style={{ paddingInlineStart: trafficLightInset, ...style }}
      {...props}
    />
  );
}

interface SearchProps extends React.ComponentPropsWithoutRef<"div"> {}

function Search({ className, ...props }: SearchProps) {
  return <div className={cn(styles.search, className)} {...props} />;
}

interface SearchIconProps extends React.ComponentPropsWithoutRef<"span"> {}

function SearchIcon({ className, ...props }: SearchIconProps) {
  return (
    <span
      aria-hidden
      className={cn(styles["search-icon"], className)}
      {...props}
    />
  );
}

interface SearchInputProps extends React.ComponentProps<"input"> {}

function SearchInput({ className, ref, ...props }: SearchInputProps) {
  return (
    <input
      ref={ref}
      className={cn(styles["search-input"], className)}
      {...props}
    />
  );
}

interface RightProps extends React.ComponentPropsWithoutRef<"div"> {}

function Right({ className, ...props }: RightProps) {
  return <div className={cn(styles.right, className)} {...props} />;
}

export const HeaderToolbar = {
  Root,
  Toolbar,
  Search,
  SearchIcon,
  SearchInput,
  Right,
};

const ZOOM_MIN = 80;

const ZOOM_MAX = 240;

const ZOOM_STEP = 10;

const ZOOM_DEFAULT = 130;

interface ZoomControlsProps {
  value: number;
  onChange: (next: number) => void;
}

function ZoomControls({ value, onChange }: ZoomControlsProps) {
  const clamp = useCallback(
    (n: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n)),
    [],
  );
  const step = useCallback(
    (delta: number) => onChange(clamp(value + delta)),
    [clamp, onChange, value],
  );
  return (
    <fieldset className={styles.zoom}>
      <legend className={styles["sr-only"]}>Grid zoom</legend>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              icon
              variant="ghost"
              size="xs"
              aria-label="Smaller cards"
              onClick={() => step(-ZOOM_STEP)}
              disabled={value <= ZOOM_MIN}
            >
              <IconMinusOutline18 size={12} />
            </Button>
          }
        />
        <Tooltip.Portal>
          <Tooltip.Positioner side="bottom">
            <Tooltip.Popup>Smaller cards</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        aria-label="Grid zoom"
        className={styles["zoom-slider"]}
      />
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              icon
              variant="ghost"
              size="xs"
              aria-label="Larger cards"
              onClick={() => step(ZOOM_STEP)}
              disabled={value >= ZOOM_MAX}
            >
              <IconPlusOutline18 size={12} />
            </Button>
          }
        />
        <Tooltip.Portal>
          <Tooltip.Positioner side="bottom">
            <Tooltip.Popup>Larger cards</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </fieldset>
  );
}

function useZoom(): [number, (next: number) => void] {
  const [zoom, setZoomState] = useState<number>(() => {
    if (typeof window === "undefined") return ZOOM_DEFAULT;
    const raw = window.localStorage.getItem("pond.gridZoom");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : ZOOM_DEFAULT;
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--grid-min", `${zoom}px`);
    try {
      window.localStorage.setItem("pond.gridZoom", String(zoom));
    } catch {
      /* fail silently if storage is denied */
    }
  }, [zoom]);

  return [zoom, setZoomState];
}
