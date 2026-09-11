import { Button, Input } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { savePrefsSection, usePrefs } from "@/features/settings/state/prefs";
import {
  chordGlyphs,
  isShortcutId,
  isValidShortcut,
  resolveShortcuts,
  type ShortcutId,
  shortcutConflict,
} from "@/shared/lib/shortcuts";
import styles from "./shortcut-settings.module.css";

export function ShortcutSettings() {
  const [preferences, , loaded] = usePrefs("shortcuts");
  const [search, setSearch] = useState("");
  const [recording, setRecording] = useState<ShortcutId | null>(null);
  const [error, setError] = useState("");
  const [nativeErrors, setNativeErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  useEffect(() => {
    let active = true;
    void window.pond
      .query("settings.globalShortcutStatus", {})
      .then((status) => {
        if (active) setNativeErrors(status.errors);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const patch = async (delta: Partial<typeof preferences>) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try {
      await savePrefsSection("shortcuts", delta);
      setRecording(null);
      await window.pond
        .query("settings.globalShortcutStatus", {})
        .then((status) => setNativeErrors(status.errors))
        .catch(() => {
          setNativeErrors([
            "Couldn’t check global shortcut availability. Reopen Settings to retry.",
          ]);
        });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn’t change this shortcut. Your previous shortcut is unchanged.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  const current = loaded
    ? preferences
    : { profile: "pond" as const, overrides: {} };
  const bindings = resolveShortcuts(current);
  return (
    <div className={styles.root}>
      <fieldset className={styles.profiles} aria-label="Shortcut Profile">
        {(["pond", "eagle"] as const).map((profile) => (
          <Button
            key={profile}
            variant={current.profile === profile ? "primary" : "secondary"}
            aria-pressed={current.profile === profile}
            disabled={!loaded || pending}
            onClick={() => {
              setError("");
              setRecording(null);
              void patch({ profile });
            }}
          >
            {profile === "pond" ? "Pond" : "Eagle"}
          </Button>
        ))}
      </fieldset>
      <p>
        Eagle uses T for tags, 0–5 for ratings, and Shift+0–5 to rate and
        advance. Layout shortcuts move to Alt+1–4.
      </p>
      <p>Global shortcuts work while Pond is in the background.</p>
      {nativeErrors.map((message) => (
        <p role="alert" key={message}>
          {message}
        </p>
      ))}
      <Input.Field
        aria-label="Find a shortcut"
        placeholder="Find a shortcut…"
        value={search}
        onValueChange={setSearch}
      />
      <div className={styles.list}>
        {Object.keys(bindings)
          .filter(isShortcutId)
          .filter(
            (id) =>
              bindings[id].keys &&
              `${bindings[id].group} ${bindings[id].label}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
          .map((id) => (
            <div className={styles.row} key={id}>
              <span>
                {bindings[id].label}
                <small>{bindings[id].group}</small>
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!loaded || pending}
                aria-label={`Change ${bindings[id].label} shortcut`}
                onClick={() => {
                  setRecording(id);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (recording !== id || pendingRef.current) return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.key === "Escape") {
                    setRecording(null);
                    return;
                  }
                  if (["Meta", "Control", "Alt", "Shift"].includes(event.key))
                    return;
                  const key = event.code.startsWith("Digit")
                    ? event.code.slice(5)
                    : event.code.startsWith("Key")
                      ? event.code.slice(3)
                      : event.code === "Space"
                        ? "Space"
                        : event.key;
                  const keys = [
                    event.metaKey ? "Meta" : null,
                    event.ctrlKey ? "Control" : null,
                    event.altKey ? "Alt" : null,
                    event.shiftKey ? "Shift" : null,
                    key,
                  ]
                    .filter(Boolean)
                    .join("+");
                  if (!isValidShortcut(keys)) {
                    setError("Choose a supported key combination.");
                    return;
                  }
                  const conflict = shortcutConflict(id, keys, current);
                  if (conflict) {
                    setError(
                      `Already used by ${conflict}. Choose another shortcut.`,
                    );
                    return;
                  }
                  void patch({
                    overrides: { ...current.overrides, [id]: keys },
                  });
                }}
              >
                {recording === id
                  ? "Press keys…"
                  : chordGlyphs(bindings[id].keys ?? "").join(" ")}
              </Button>
              {current.overrides[id] ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Reset ${bindings[id].label} shortcut`}
                  disabled={pending}
                  onClick={() => {
                    const overrides = { ...current.overrides };
                    delete overrides[id];
                    void patch({ overrides });
                  }}
                >
                  Reset
                </Button>
              ) : null}
            </div>
          ))}
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
