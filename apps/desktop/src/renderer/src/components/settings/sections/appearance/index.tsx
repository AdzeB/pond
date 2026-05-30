import { DEFAULT_PREFS } from "@pond/schema/db";
import { Button, Input, Select, Switch } from "@pond/ui";
import { ChevronsUpDown, Minus, Plus, RotateCcw } from "lucide-react";
import { Settings } from "@/components/settings";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

const DEFAULTS = DEFAULT_PREFS.preferences;

const UI_FONT_MIN = 11;
const UI_FONT_MAX = 18;
const CODE_FONT_MIN = 10;
const CODE_FONT_MAX = 18;

export function AppearanceSection() {
  const [prefs, patch] = usePrefs("preferences");

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Appearance</Settings.Title>
        <Settings.Description>
          Theme, motion, and typography.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Theme</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Theme</Settings.ItemTitle>
              <Settings.ItemDescription>
                System follows your OS. High contrast strengthens borders and
                text.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={prefs.theme}
                onValueChange={(v) =>
                  patch({
                    theme: v as "system" | "light" | "dark" | "high-contrast",
                  })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="system">
                        System Preference
                      </Select.Item>
                      <Select.Item value="light">Light</Select.Item>
                      <Select.Item value="dark">Dark</Select.Item>
                      <Select.Item value="high-contrast">
                        High Contrast
                      </Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Accessibility</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Reduce Motion</Settings.ItemTitle>
              <Settings.ItemDescription>
                Tone down animations and transitions across Pond.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={prefs.reduceMotion}
                onValueChange={(v) =>
                  patch({
                    reduceMotion: v as "system" | "always" | "never",
                  })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="system">Match System</Select.Item>
                      <Select.Item value="always">Always Reduce</Select.Item>
                      <Select.Item value="never">Never Reduce</Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Reduce Transparency</Settings.ItemTitle>
              <Settings.ItemDescription>
                Swap blurred surfaces for opaque fills.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={prefs.reduceTransparency}
                onCheckedChange={(v) => patch({ reduceTransparency: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Typography</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>UI Font Size</Settings.ItemTitle>
              <Settings.ItemDescription>
                Base size for the interface. Affects rows, menus, and chrome.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <FontSizeStepper
                value={prefs.uiFontSize}
                onChange={(n) => patch({ uiFontSize: n })}
                min={UI_FONT_MIN}
                max={UI_FONT_MAX}
                fallback={DEFAULTS.uiFontSize}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Code Font Size</Settings.ItemTitle>
              <Settings.ItemDescription>
                Size for code blocks and other monospace text.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <FontSizeStepper
                value={prefs.codeFontSize}
                onChange={(n) => patch({ codeFontSize: n })}
                min={CODE_FONT_MIN}
                max={CODE_FONT_MAX}
                fallback={DEFAULTS.codeFontSize}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}

interface FontSizeStepperProps {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  fallback: number;
}

function FontSizeStepper({
  value,
  onChange,
  min,
  max,
  fallback,
}: FontSizeStepperProps) {
  const safe = Number.isFinite(value) ? value : fallback;
  return (
    <div className={styles.stepper}>
      <Button
        size="xs"
        variant="ghost"
        aria-label="Decrease"
        onClick={() => onChange(clamp(safe - 1, min, max))}
        disabled={safe <= min}
      >
        <Minus />
      </Button>
      <Input.Field
        data-size="sm"
        type="number"
        min={min}
        max={max}
        value={String(safe)}
        onChange={(e) =>
          onChange(clamp(Number(e.target.value) || fallback, min, max))
        }
        className={styles["stepper-input"]}
      />
      <Button
        size="xs"
        variant="ghost"
        aria-label="Increase"
        onClick={() => onChange(clamp(safe + 1, min, max))}
        disabled={safe >= max}
      >
        <Plus />
      </Button>
      <Button
        size="xs"
        variant="ghost"
        aria-label="Reset"
        onClick={() => onChange(fallback)}
        disabled={safe === fallback}
      >
        <RotateCcw />
      </Button>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
