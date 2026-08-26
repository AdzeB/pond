import { Button, Settings, Shell } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import {
  SOUND_AUDITIONS,
  type SoundAudition,
  UI_SOUND_NAMES,
  type UiSoundName,
} from "@/lib/ui/sound-packs";
import { playUiDefinition, playUiPreview } from "@/lib/ui/sounds";
import styles from "./styles.module.css";

const CUES: ReadonlyArray<{
  name: UiSoundName;
  title: string;
  description: string;
  group: string;
}> = [
  {
    name: "tap",
    title: "Tap",
    description: "Primary buttons, menu items, and links.",
    group: "Clicks",
  },
  {
    name: "soft",
    title: "Soft",
    description: "Ghost, tertiary, and link controls.",
    group: "Clicks",
  },
  {
    name: "toggleOn",
    title: "Toggle On",
    description: "Switches and checkboxes when they turn on.",
    group: "Toggles",
  },
  {
    name: "toggleOff",
    title: "Toggle Off",
    description: "Switches and checkboxes when they turn off.",
    group: "Toggles",
  },
  {
    name: "success",
    title: "Success",
    description: "Finished captures, linking, and similar confirms.",
    group: "Confirms",
  },
  {
    name: "trash",
    title: "Trash",
    description: "Moving a save into trash.",
    group: "Finder",
  },
];

const HOLD_MS: Record<UiSoundName, number> = {
  tap: 220,
  soft: 200,
  toggleOn: 260,
  toggleOff: 280,
  success: 380,
  trash: 420,
};

const GROUPS = ["Clicks", "Toggles", "Confirms", "Finder"] as const;

export function SoundsPage() {
  const scrollFade = useScrollFade<HTMLElement>();
  const timers = useRef<number[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [playingAll, setPlayingAll] = useState(false);

  function clearTimers() {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    },
    [],
  );

  function play(name: UiSoundName) {
    setActive(name);
    playUiPreview(name);
  }

  function playAudition(cue: SoundAudition) {
    setActive(cue.id);
    playUiDefinition(cue.definition);
  }

  function playAll() {
    clearTimers();
    setPlayingAll(true);
    let at = 0;
    for (const name of UI_SOUND_NAMES) {
      const start = at;
      timers.current.push(
        window.setTimeout(() => {
          play(name);
        }, start),
      );
      at += HOLD_MS[name];
    }
    timers.current.push(
      window.setTimeout(() => {
        setPlayingAll(false);
        setActive(null);
      }, at),
    );
  }

  function repeatTap() {
    clearTimers();
    setPlayingAll(false);
    for (let i = 0; i < 8; i++) {
      timers.current.push(
        window.setTimeout(() => {
          play("tap");
        }, i * 55),
      );
    }
    timers.current.push(
      window.setTimeout(
        () => {
          setActive(null);
        },
        8 * 55 + HOLD_MS.tap,
      ),
    );
  }

  return (
    <AppShell.Content>
      <Shell.Body>
        <Shell.Main className={styles.main} {...scrollFade}>
          <Settings.Page className={styles.page} data-sound="none">
            <Settings.Header>
              <Settings.HeaderText>
                <Settings.Title>Sounds</Settings.Title>
                <Settings.Description>
                  Play each interface cue. This page ignores the Interface
                  Sounds switch.
                </Settings.Description>
              </Settings.HeaderText>
              <div className={styles.actions}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={repeatTap}
                  disabled={playingAll}
                >
                  Repeat Tap
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={playAll}
                  disabled={playingAll}
                >
                  {playingAll ? "Playing" : "Play All"}
                </Button>
              </div>
            </Settings.Header>
            {GROUPS.map((group) => (
              <Settings.Section key={group}>
                <Settings.SectionTitle>{group}</Settings.SectionTitle>
                <Settings.List>
                  {CUES.filter((cue) => cue.group === group).map((cue) => (
                    <Settings.Item
                      key={cue.name}
                      data-highlight={active === cue.name || undefined}
                    >
                      <Settings.ItemDetails>
                        <Settings.ItemTitle>{cue.title}</Settings.ItemTitle>
                        <Settings.ItemDescription>
                          {cue.description}
                        </Settings.ItemDescription>
                      </Settings.ItemDetails>
                      <Settings.ItemControl>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            clearTimers();
                            setPlayingAll(false);
                            play(cue.name);
                          }}
                        >
                          Play
                        </Button>
                      </Settings.ItemControl>
                    </Settings.Item>
                  ))}
                </Settings.List>
              </Settings.Section>
            ))}
            <Settings.Section>
              <Settings.SectionTitle>Audition</Settings.SectionTitle>
              <Settings.List>
                {SOUND_AUDITIONS.map((cue) => (
                  <Settings.Item
                    key={cue.id}
                    data-highlight={active === cue.id || undefined}
                  >
                    <Settings.ItemDetails>
                      <Settings.ItemTitle>{cue.title}</Settings.ItemTitle>
                      <Settings.ItemDescription>
                        {cue.description}
                      </Settings.ItemDescription>
                    </Settings.ItemDetails>
                    <Settings.ItemControl>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          clearTimers();
                          setPlayingAll(false);
                          playAudition(cue);
                        }}
                      >
                        Play
                      </Button>
                    </Settings.ItemControl>
                  </Settings.Item>
                ))}
              </Settings.List>
            </Settings.Section>
          </Settings.Page>
        </Shell.Main>
      </Shell.Body>
    </AppShell.Content>
  );
}
