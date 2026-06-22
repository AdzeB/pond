import { IconCheck3Outline12 as Check } from "@pond/icons/outline/12";
import {
  IconFolderOpenOutline18 as FolderOpen,
  IconPenOutline18 as Pencil,
  IconArchivePlusOutline18 as Plus,
  IconGearOutline18 as Settings,
} from "@pond/icons/outline/18";
import { IconGithub, IconXTwitter } from "@pond/icons/social-media";
import { Menu } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { usePonds } from "@/hooks/use-ponds";
import { glyphKind, PondGlyph } from "@/lib/pond-icons";
import { prettyPath } from "@/lib/pretty-path";
import { pondCustomise } from "@/stores/pond-customise";
import styles from "./styles.module.css";

const GITHUB_URL = "https://github.com/raphaelsalaja/pond";
const TWITTER_URL = "https://x.com/raphaelsalaja";

export function LibrarySwitcher() {
  const { ponds, active, switching, switchTo, refresh } = usePonds();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ponds;
    return ponds.filter(
      (pond) =>
        pond.name.toLowerCase().includes(needle) ||
        pond.path.toLowerCase().includes(needle),
    );
  }, [ponds, query]);

  async function switchExisting() {
    const res = (await window.pond.query("library.pickExisting", {})) as
      | { ok: true; path: string }
      | { ok: false; reason: string };
    if (res.ok) switchTo(res.path);
  }

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) {
          setQuery("");
          refresh();
        }
      }}
    >
      <Menu.Trigger
        aria-label={`Library menu (${active?.name ?? "Library"})`}
        render={
          <button type="button" className={styles.trigger}>
            <span
              className={styles.glyph}
              data-icon={
                active && glyphKind(active.avatar) === "icon" ? true : undefined
              }
              style={{ background: active?.color ?? undefined }}
            >
              {active ? (
                <PondGlyph
                  avatar={active.avatar}
                  name={active.name}
                  iconSize={16}
                />
              ) : (
                "P"
              )}
            </span>
          </button>
        }
      ></Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start">
          <Menu.Popup className={styles.popup}>
            <Menu.Input
              className={styles.search}
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className={styles.list}>
              {filtered.map((pond) => (
                <Menu.Item
                  key={pond.path}
                  className={styles.row}
                  disabled={switching || pond.active || !pond.exists}
                  onClick={() => switchTo(pond.path)}
                >
                  <span
                    aria-hidden
                    className={styles.avatar}
                    data-emoji={glyphKind(pond.avatar) === "emoji" || undefined}
                    data-icon={glyphKind(pond.avatar) === "icon" || undefined}
                    data-missing={!pond.exists || undefined}
                    style={pond.color ? { background: pond.color } : undefined}
                  >
                    <PondGlyph
                      avatar={pond.avatar}
                      name={pond.name}
                      iconSize={18}
                    />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowName}>{pond.name}</span>
                    <span className={styles.rowPath}>
                      {prettyPath(pond.path)}
                    </span>
                  </span>
                  {pond.active ? (
                    <Check className={styles.check} aria-hidden />
                  ) : null}
                </Menu.Item>
              ))}
              {filtered.length === 0 ? (
                <div className={styles.empty}>
                  {ponds.length === 0
                    ? "No libraries yet."
                    : "No libraries match."}
                </div>
              ) : null}
            </div>

            <Menu.Separator />

            <Menu.Item onClick={() => pondCustomise.open(active?.path)}>
              <Menu.ItemIcon>
                <Pencil />
              </Menu.ItemIcon>
              Edit Pond
            </Menu.Item>
            <Menu.Item
              onClick={() => void window.pond.query("library.create", {})}
            >
              <Menu.ItemIcon>
                <Plus />
              </Menu.ItemIcon>
              Create Pond
              <Menu.SecondaryLabel>L then C</Menu.SecondaryLabel>
            </Menu.Item>
            <Menu.Item onClick={() => void switchExisting()}>
              <Menu.ItemIcon>
                <FolderOpen />
              </Menu.ItemIcon>
              Switch library…
            </Menu.Item>

            <Menu.Separator />

            <Menu.Item onClick={() => void navigate({ to: "/settings" })}>
              <Menu.ItemIcon>
                <Settings />
              </Menu.ItemIcon>
              Settings
              <Menu.SecondaryLabel>⌘,</Menu.SecondaryLabel>
            </Menu.Item>

            <Menu.Separator />

            <Menu.Item
              onClick={() => void window.pond.openExternal(GITHUB_URL)}
            >
              <Menu.ItemIcon>
                <IconGithub width={16} height={16} fill="currentColor" />
              </Menu.ItemIcon>
              GitHub
            </Menu.Item>
            <Menu.Item
              onClick={() => void window.pond.openExternal(TWITTER_URL)}
            >
              <Menu.ItemIcon>
                <IconXTwitter width={16} height={16} fill="currentColor" />
              </Menu.ItemIcon>
              Twitter
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
