import {
  IconArrowRotateAnticlockwiseOutline12,
  IconChevronExpandYOutline12,
  IconMinusOutline12,
  IconPlusOutline12,
} from "@pond/icons/outline/12";
import { DEFAULT_PREFS } from "@pond/schema/db";
import { Button, Input, Select, Slider, Switch } from "@pond/ui";
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

  const tintActive =
    (prefs.tintHue ?? null) !== null && prefs.tintIntensity > 0;

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Appearance</Settings.Title>
        <Settings.Description>
          Theme, density, motion, tint, and typography.
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
                    <IconChevronExpandYOutline12 />
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

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Density</Settings.ItemTitle>
              <Settings.ItemDescription>
                How tightly rows pack together. Larger means roomier.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={prefs.density}
                onValueChange={(v) =>
                  patch({
                    density: v as "compact" | "comfortable" | "spacious",
                  })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <IconChevronExpandYOutline12 />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="compact">Compact</Select.Item>
                      <Select.Item value="comfortable">Comfortable</Select.Item>
                      <Select.Item value="spacious">Spacious</Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Tint</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item className={styles["slider-row"]}>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Hue</Settings.ItemTitle>
              <Settings.ItemDescription>
                Shifts accent colors. Takes effect when intensity is above zero.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl className={styles["slider-control"]}>
              <Slider.Root
                value={prefs.tintHue ?? 0}
                min={0}
                max={360}
                step={1}
                onValueChange={(v) =>
                  patch({ tintHue: typeof v === "number" ? v : (v[0] ?? 0) })
                }
                className={styles.slider}
              >
                <Slider.Control className={styles["slider-track-wrap"]}>
                  <Slider.Track className={styles["slider-track"]}>
                    <Slider.Indicator className={styles["slider-indicator"]} />
                    <Slider.Thumb className={styles["slider-thumb"]} />
                  </Slider.Track>
                </Slider.Control>
              </Slider.Root>
              <span className={styles["slider-value"]}>
                {prefs.tintHue ?? 0}°
              </span>
              <Button
                size="xs"
                variant="ghost"
                aria-label="Reset hue"
                onClick={() => patch({ tintHue: null })}
                disabled={(prefs.tintHue ?? null) === null}
              >
                <IconArrowRotateAnticlockwiseOutline12 />
              </Button>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item className={styles["slider-row"]}>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Intensity</Settings.ItemTitle>
              <Settings.ItemDescription>
                How strongly the hue colors the UI. Zero means no tint.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl className={styles["slider-control"]}>
              <Slider.Root
                value={prefs.tintIntensity}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) =>
                  patch({
                    tintIntensity: typeof v === "number" ? v : (v[0] ?? 0),
                  })
                }
                className={styles.slider}
              >
                <Slider.Control className={styles["slider-track-wrap"]}>
                  <Slider.Track className={styles["slider-track"]}>
                    <Slider.Indicator className={styles["slider-indicator"]} />
                    <Slider.Thumb className={styles["slider-thumb"]} />
                  </Slider.Track>
                </Slider.Control>
              </Slider.Root>
              <span className={styles["slider-value"]}>
                {prefs.tintIntensity}%
              </span>
              <Button
                size="xs"
                variant="ghost"
                aria-label="Reset intensity"
                onClick={() => patch({ tintIntensity: 0 })}
                disabled={prefs.tintIntensity === 0}
              >
                <IconArrowRotateAnticlockwiseOutline12 />
              </Button>
            </Settings.ItemControl>
          </Settings.Item>

          {!tintActive ? (
            <Settings.Item className={styles["hint-row"]}>
              <Settings.ItemDetails>
                <Settings.ItemDescription>
                  Tint is off. Raise intensity above zero to apply the hue.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
            </Settings.Item>
          ) : null}
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
                    <IconChevronExpandYOutline12 />
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

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>UI Font Family</Settings.ItemTitle>
              <Settings.ItemDescription>
                Override the interface typeface. Empty falls back to system.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Input.Field
                data-size="sm"
                placeholder="System default"
                value={prefs.uiFontFamily}
                onChange={(e) => patch({ uiFontFamily: e.target.value })}
                style={{ width: 200 }}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Code Font Family</Settings.ItemTitle>
              <Settings.ItemDescription>
                Override the monospace typeface. Empty falls back to system.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Input.Field
                data-size="sm"
                placeholder="System monospace"
                value={prefs.codeFontFamily}
                onChange={(e) => patch({ codeFontFamily: e.target.value })}
                style={{ width: 200 }}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Font Smoothing</Settings.ItemTitle>
              <Settings.ItemDescription>
                Antialias text. Turn off for sharper pixel rendering.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={prefs.fontSmoothing}
                onCheckedChange={(v) => patch({ fontSmoothing: v })}
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
        <IconMinusOutline12 />
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
        <IconPlusOutline12 />
      </Button>
      <Button
        size="xs"
        variant="ghost"
        aria-label="Reset"
        onClick={() => onChange(fallback)}
        disabled={safe === fallback}
      >
        <IconArrowRotateAnticlockwiseOutline12 />
      </Button>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
