import {
  IconBarsFilterOutline18,
  IconEyeOutline18,
  IconMagnifierOutline18,
  IconMinusOutline18,
  IconPlusOutline18,
} from "@pond/icons/outline/18";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { readQuery, writeQuery } from "@pond/schema/filters/url";
import {
  Button,
  Input,
  Menu,
  Toolbar as PondToolbar,
  Slider,
  Tooltip,
} from "@pond/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AddCommitApi,
  appendPredicate,
  replacePredicate,
} from "@/components/filter-bar/helpers";
import { AddFilterMenu } from "@/components/filter-bar/registry";
import { ViewPicker } from "@/components/library/toolbar/menus/layout";
import { usePlatform } from "@/lib/platform";
import { useFilterHotkey, useSearchHotkey } from "@/lib/use-hotkeys";
import { useSidebar } from "@/lib/use-sidebar";
import { useZoom, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/lib/use-zoom";
import styles from "./styles.module.css";

function Root() {
  const { open: sidebarOpen } = useSidebar();
  const platform = usePlatform();
  const trafficLightInset = platform === "mac" && !sidebarOpen ? 72 : 0;

  return (
    <PondToolbar.Root
      aria-label="Library toolbar"
      className={styles.toolbar}
      style={{ paddingInlineStart: trafficLightInset }}
    >
      <Search />
      <PondToolbar.Group data-align="end" className={styles.right}>
        <Zoom />
        <ViewOptionsButton />
        <AddFilterButton />
      </PondToolbar.Group>
    </PondToolbar.Root>
  );
}

export const HeaderToolbar = { Root };

const SEARCH_DEBOUNCE_MS = 150;

function Search() {
  const [params, setParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const urlSearch = params.get("q") ?? "";
  const [value, setValue] = useState(urlSearch);

  useEffect(() => {
    setValue(urlSearch);
  }, [urlSearch]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setValue(next);
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

  useSearchHotkey(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  });

  return (
    <Input.Root className={styles.search}>
      <Input.Icon>
        <IconMagnifierOutline18 />
      </Input.Icon>
      <Input.Field
        ref={inputRef}
        type="search"
        placeholder="Search"
        value={value}
        onChange={onChange}
        aria-label="Search saves"
      />
    </Input.Root>
  );
}

function Zoom() {
  const [value, setValue] = useZoom();
  const step = useCallback(
    (delta: number) => setValue(value + delta),
    [setValue, value],
  );

  return (
    <fieldset className={styles.zoom}>
      <legend className={styles["sr-only"]}>Grid zoom</legend>
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
      <Slider.Root
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={value}
        onValueChange={(next) => {
          const n = typeof next === "number" ? next : next[0];
          if (n !== undefined) setValue(n);
        }}
        className={styles["zoom-slider"]}
      >
        <Slider.Control className={styles["zoom-slider-control"]}>
          <Slider.Track className={styles["zoom-slider-track"]}>
            <Slider.Indicator className={styles["zoom-slider-indicator"]} />
            <Slider.Thumb
              aria-label="Grid zoom"
              className={styles["zoom-slider-thumb"]}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
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
    </fieldset>
  );
}

function ViewOptionsButton() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <ViewPicker.Root
            trigger={
              <Button icon variant="ghost" size="xs" aria-label="View options">
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
  );
}

function AddFilterButton() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const api = useMemo<AddCommitApi>(() => {
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
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  });

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Menu.Trigger
              render={
                <Button icon variant="ghost" size="xs" aria-label="Add filter">
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
            <AddFilterMenu api={api} inputRef={inputRef} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
