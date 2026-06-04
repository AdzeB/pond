import {
  IconChevronExpandYOutline18 as ChevronsUpDown,
  IconMinusOutline18 as Minus,
  IconPlusOutline18 as Plus,
  IconArrowRotateAnticlockwiseOutline18 as RotateCcw,
} from "@pond/icons/outline/18";
import {
  ACCENT_HUES,
  ACCENT_INTENSITY_MAX,
  ACCENT_INTENSITY_MIN,
  type AccentChoice,
  CUSTOM_HUE_MAX,
  CUSTOM_HUE_MIN,
  DEFAULT_PREFS,
  NEUTRAL_HUES,
  type NeutralHue,
  RADIUS_MAX,
  RADIUS_MIN,
} from "@pond/schema/db";
import { Button, Input, Select, Slider, Switch } from "@pond/ui";
import { Settings } from "@/components/settings";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

const DEFAULTS = DEFAULT_PREFS.preferences;

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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
        <Settings.SectionTitle>Color</Settings.SectionTitle>
        <Settings.List>
          <div
            className={`${styles["color-row"]} ${styles["color-row-stack"]}`}
          >
            <div className={styles["color-head"]}>
              <h3 className={styles["color-title"]}>Accent</h3>
              <p className={styles["color-description"]}>
                The primary color for buttons, links, and selection.
              </p>
            </div>
            <SwatchGrid
              names={ACCENT_HUES}
              value={prefs.accentHue}
              onSelect={(v) => patch({ accentHue: v as AccentChoice })}
              showCustom
              customSelected={prefs.accentHue === "custom"}
              customHue={prefs.customHue}
              onCustom={() => patch({ accentHue: "custom" })}
            />
            {prefs.accentHue === "custom" ? (
              <SettingSlider
                ariaLabel="Custom hue"
                min={CUSTOM_HUE_MIN}
                max={CUSTOM_HUE_MAX}
                step={1}
                value={prefs.customHue}
                suffix="°"
                trackClassName={styles["hue-track"]}
                onChange={(n) => patch({ customHue: n })}
              />
            ) : null}
          </div>

          <div
            className={`${styles["color-row"]} ${styles["color-row-stack"]}`}
          >
            <div className={styles["color-head"]}>
              <h3 className={styles["color-title"]}>Neutral</h3>
              <p className={styles["color-description"]}>
                The temperature of backgrounds, borders, and text.
              </p>
            </div>
            <SwatchGrid
              names={NEUTRAL_HUES}
              value={prefs.neutralHue}
              onSelect={(v) => patch({ neutralHue: v as NeutralHue })}
            />
          </div>

          <div className={styles["color-row"]}>
            <div className={styles["color-head"]}>
              <h3 className={styles["color-title"]}>Accent Intensity</h3>
              <p className={styles["color-description"]}>
                How saturated the accent reads. Lower blends toward neutral.
              </p>
            </div>
            <SettingSlider
              ariaLabel="Accent intensity"
              min={ACCENT_INTENSITY_MIN}
              max={ACCENT_INTENSITY_MAX}
              step={5}
              value={prefs.accentIntensity}
              suffix="%"
              onChange={(n) => patch({ accentIntensity: n })}
            />
          </div>

          <div className={styles["color-row"]}>
            <div className={styles["color-head"]}>
              <h3 className={styles["color-title"]}>Corner Radius</h3>
              <p className={styles["color-description"]}>
                Roundness of cards, buttons, inputs, and menus.
              </p>
            </div>
            <SettingSlider
              ariaLabel="Corner radius"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={1}
              value={prefs.radius}
              suffix="px"
              onChange={(n) => patch({ radius: n })}
            />
          </div>

          <div className={styles["color-row"]}>
            <div className={styles["color-head"]}>
              <h3 className={styles["color-title"]}>Reset Color</h3>
              <p className={styles["color-description"]}>
                Restore the default accent, neutral, intensity, and radius.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                patch({
                  accentHue: DEFAULTS.accentHue,
                  customHue: DEFAULTS.customHue,
                  neutralHue: DEFAULTS.neutralHue,
                  accentIntensity: DEFAULTS.accentIntensity,
                  radius: DEFAULTS.radius,
                })
              }
            >
              <RotateCcw />
              Reset
            </Button>
          </div>
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

interface SwatchGridProps {
  names: readonly string[];
  value: string;
  onSelect: (name: string) => void;
  showCustom?: boolean;
  customSelected?: boolean;
  customHue?: number;
  onCustom?: () => void;
}

function SwatchGrid({
  names,
  value,
  onSelect,
  showCustom,
  customSelected,
  customHue,
  onCustom,
}: SwatchGridProps) {
  return (
    <div className={styles.swatches}>
      {names.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={titleCase(name)}
          aria-pressed={name === value}
          title={titleCase(name)}
          data-selected={name === value}
          className={styles.swatch}
          style={{ backgroundColor: `var(--${name}-500)` }}
          onClick={() => onSelect(name)}
        />
      ))}
      {showCustom ? (
        <button
          type="button"
          aria-label="Custom"
          aria-pressed={customSelected}
          title="Custom"
          data-selected={customSelected}
          className={`${styles.swatch} ${styles["swatch-custom"]}`}
          style={
            customSelected
              ? {
                  backgroundImage: "none",
                  backgroundColor: `oklch(0.64 0.15 ${customHue ?? 250})`,
                }
              : undefined
          }
          onClick={onCustom}
        />
      ) : null}
    </div>
  );
}

interface SettingSliderProps {
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  suffix: string;
  trackClassName?: string;
  onChange: (next: number) => void;
}

function SettingSlider({
  ariaLabel,
  min,
  max,
  step,
  value,
  suffix,
  trackClassName,
  onChange,
}: SettingSliderProps) {
  const safe = Number.isFinite(value) ? value : min;
  return (
    <div className={styles["slider-control"]}>
      <Slider.Root
        min={min}
        max={max}
        step={step}
        value={safe}
        onValueChange={(next) => {
          const n = typeof next === "number" ? next : next[0];
          if (n !== undefined) onChange(clamp(n, min, max));
        }}
        className={styles.slider}
      >
        <Slider.Control className={styles["slider-track-control"]}>
          <Slider.Track
            className={
              trackClassName
                ? `${styles["slider-track"]} ${trackClassName}`
                : styles["slider-track"]
            }
          >
            {trackClassName ? null : (
              <Slider.Indicator className={styles["slider-indicator"]} />
            )}
            <Slider.Thumb
              aria-label={ariaLabel}
              className={styles["slider-thumb"]}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <span className={styles["slider-value"]}>
        {safe}
        {suffix}
      </span>
    </div>
  );
}
