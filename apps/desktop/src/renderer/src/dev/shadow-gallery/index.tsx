import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import "../../styles.css";
import styles from "./styles.module.css";

type Theme = "light" | "dark";
type Backdrop = "soft" | "plain" | "contrast";
type System = "Pond" | "Linear" | "Vercel";
type ContextKind = "raised" | "popover" | "dialog";
type ThemeShadow = Record<Theme, string>;

interface ShadowSpecimen {
  darkValue?: string;
  description: string;
  name: string;
  value: string;
}

interface ContextComparisonProps {
  description: string;
  kind: ContextKind;
  linearShadow: string;
  pondShadow: string;
  title: string;
  vercelShadow: ThemeShadow;
}

const LINEAR_LOW_SHADOW = "0 3px 6px -2px #00000005, 0 1px 1px #0000000a";
const LINEAR_MEDIUM_SHADOW =
  "0 6px 18px #00000005, 0 3px 9px #0000000a, 0 1px 1px #0000000a";
const LINEAR_HIGH_SHADOW =
  "0 9px 48px #00000014, 0 6px 24px #00000019, 0 1px 1px #0000000a";

const VERCEL_SMALL_SHADOW: ThemeShadow = {
  light:
    "rgb(0 0 0 / 8%) 0 0 0 1px, rgb(0 0 0 / 4%) 0 2px 2px, #fafafa 0 0 0 1px",
  dark: "rgb(255 255 255 / 14.5%) 0 0 0 1px, rgb(0 0 0 / 16%) 0 1px 2px, #000 0 0 0 1px",
};

const VERCEL_MENU_SHADOW: ThemeShadow = {
  light:
    "rgb(0 0 0 / 8%) 0 0 0 1px, rgb(0 0 0 / 2%) 0 1px 1px, rgb(0 0 0 / 4%) 0 4px 8px -4px, rgb(0 0 0 / 6%) 0 16px 24px -8px, #fafafa 0 0 0 1px",
  dark: "rgb(255 255 255 / 14.5%) 0 0 0 1px, rgb(0 0 0 / 2%) 0 1px 1px, rgb(0 0 0 / 4%) 0 4px 8px -4px, rgb(0 0 0 / 6%) 0 16px 24px -8px, #000 0 0 0 1px",
};

const VERCEL_MODAL_SHADOW: ThemeShadow = {
  light:
    "rgb(0 0 0 / 8%) 0 0 0 1px, rgb(0 0 0 / 2%) 0 1px 1px, rgb(0 0 0 / 4%) 0 8px 16px -4px, rgb(0 0 0 / 6%) 0 24px 32px -8px, #fafafa 0 0 0 1px",
  dark: "rgb(255 255 255 / 14.5%) 0 0 0 1px, rgb(0 0 0 / 2%) 0 1px 1px, rgb(0 0 0 / 4%) 0 8px 16px -4px, rgb(0 0 0 / 6%) 0 24px 32px -8px, #000 0 0 0 1px",
};

const POND_SHADOWS: ShadowSpecimen[] = [
  {
    name: "xs",
    description: "Resting surfaces and subtle perimeters.",
    value: "var(--ds-shadow-xs)",
  },
  {
    name: "sm",
    description: "Cards, media, and search surfaces.",
    value: "var(--ds-shadow-sm)",
  },
  {
    name: "md",
    description: "Previews and raised content.",
    value: "var(--ds-shadow-md)",
  },
  {
    name: "lg",
    description: "Strongly elevated surfaces.",
    value: "var(--ds-shadow-lg)",
  },
  {
    name: "tooltip",
    description: "The lightest floating layer.",
    value: "var(--ds-shadow-tooltip)",
  },
  {
    name: "menu",
    description: "Popovers and anchored menus.",
    value: "var(--ds-shadow-menu)",
  },
  {
    name: "modal",
    description: "Dialogs and focused layers.",
    value: "var(--ds-shadow-modal)",
  },
  {
    name: "fullscreen",
    description: "The command menu and full-window takeovers.",
    value: "var(--ds-shadow-fullscreen)",
  },
];

const LINEAR_SHADOWS: ShadowSpecimen[] = [
  {
    name: "Hairline",
    description: "A half-pixel perimeter rather than visible lift.",
    value: "0 0 0 0.5px #dedede",
  },
  {
    name: "Low",
    description: "Two restrained layers for nearby surfaces.",
    value: LINEAR_LOW_SHADOW,
  },
  {
    name: "Medium",
    description: "Three layers for floating cards and popovers.",
    value: LINEAR_MEDIUM_SHADOW,
  },
  {
    name: "High",
    description: "Broad elevation used by the command menu.",
    value: LINEAR_HIGH_SHADOW,
  },
  {
    name: "Inset",
    description: "Three compact inner layers for recessed controls.",
    value:
      "0 1px 1px inset #00000011, 0 1px 3px inset #00000011, 0 2px 5px inset #00000019",
  },
  {
    name: "Accent ring",
    description: "A focused one-pixel accent perimeter.",
    value: "0 0 0 1px #6d78d5",
  },
];

const VERCEL_SHADOWS: ShadowSpecimen[] = [
  {
    name: "Base",
    description: "Everyday surface with a one-pixel material perimeter.",
    value: "rgb(0 0 0 / 8%) 0 0 0 1px, #fafafa 0 0 0 1px",
    darkValue: "rgb(255 255 255 / 14.5%) 0 0 0 1px, #000 0 0 0 1px",
  },
  {
    name: "Small",
    description: "A slightly raised six-pixel-radius surface.",
    value: VERCEL_SMALL_SHADOW.light,
    darkValue: VERCEL_SMALL_SHADOW.dark,
  },
  {
    name: "Medium",
    description: "A raised surface with a compact ambient layer.",
    value:
      "rgb(0 0 0 / 8%) 0 0 0 1px, rgb(0 0 0 / 4%) 0 2px 2px, rgb(0 0 0 / 4%) 0 8px 8px -8px, #fafafa 0 0 0 1px",
    darkValue:
      "rgb(255 255 255 / 14.5%) 0 0 0 1px, rgb(0 0 0 / 32%) 0 2px 2px, rgb(0 0 0 / 16%) 0 8px 8px -8px, #000 0 0 0 1px",
  },
  {
    name: "Large",
    description: "A broader surface lift with a soft sixteen-pixel layer.",
    value:
      "rgb(0 0 0 / 8%) 0 0 0 1px, rgb(0 0 0 / 4%) 0 2px 2px, rgb(0 0 0 / 4%) 0 8px 16px -4px, #fafafa 0 0 0 1px",
    darkValue:
      "rgb(255 255 255 / 14.5%) 0 0 0 1px, rgb(0 0 0 / 4%) 0 2px 2px, rgb(0 0 0 / 4%) 0 8px 16px -4px, #000 0 0 0 1px",
  },
  {
    name: "Tooltip",
    description: "The lightest floating material treatment.",
    value:
      "rgb(0 0 0 / 8%) 0 0 0 1px, rgb(0 0 0 / 2%) 0 1px 1px, rgb(0 0 0 / 4%) 0 4px 8px, #fafafa 0 0 0 1px",
    darkValue:
      "rgb(255 255 255 / 14.5%) 0 0 0 1px, rgb(0 0 0 / 2%) 0 1px 1px, rgb(0 0 0 / 4%) 0 4px 8px, #000 0 0 0 1px",
  },
  {
    name: "Menu",
    description: "A floating menu lifted clearly from the page.",
    value: VERCEL_MENU_SHADOW.light,
    darkValue: VERCEL_MENU_SHADOW.dark,
  },
  {
    name: "Modal",
    description: "A focused dialog with broad lower elevation.",
    value: VERCEL_MODAL_SHADOW.light,
    darkValue: VERCEL_MODAL_SHADOW.dark,
  },
  {
    name: "Fullscreen",
    description: "The largest material, sharing Modal’s shadow stack.",
    value: VERCEL_MODAL_SHADOW.light,
    darkValue: VERCEL_MODAL_SHADOW.dark,
  },
];

const CONTEXTS: ContextComparisonProps[] = [
  {
    kind: "raised",
    title: "Raised surface",
    description: "A card that needs separation without demanding focus.",
    pondShadow: "var(--ds-shadow-sm)",
    linearShadow: LINEAR_LOW_SHADOW,
    vercelShadow: VERCEL_SMALL_SHADOW,
  },
  {
    kind: "popover",
    title: "Popover",
    description: "A temporary surface anchored above the working context.",
    pondShadow: "var(--ds-shadow-menu)",
    linearShadow: LINEAR_MEDIUM_SHADOW,
    vercelShadow: VERCEL_MENU_SHADOW,
  },
  {
    kind: "dialog",
    title: "Dialog",
    description: "The highest focused layer in the interface.",
    pondShadow: "var(--ds-shadow-modal)",
    linearShadow: LINEAR_HIGH_SHADOW,
    vercelShadow: VERCEL_MODAL_SHADOW,
  },
];

const initialTheme: Theme = matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";

document.documentElement.dataset.theme = initialTheme;

declare global {
  interface Window {
    __pondShadowGalleryRoot?: Root;
  }
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}) {
  return (
    <fieldset className={styles.control}>
      <legend>{label}</legend>
      <div className={styles.segments}>
        {options.map((option) => (
          <button
            aria-pressed={option === value}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ShadowSwatch({
  shadow,
  theme,
}: {
  shadow: ShadowSpecimen;
  theme: Theme;
}) {
  const value =
    theme === "dark" ? (shadow.darkValue ?? shadow.value) : shadow.value;

  return (
    <article className={styles.swatchCard}>
      <div className={styles.swatchCanvas}>
        <div className={styles.swatch} style={{ boxShadow: value }}>
          <span className={styles.swatchMark} />
          <span>{shadow.name}</span>
        </div>
      </div>
      <div className={styles.swatchDetails}>
        <h3>{shadow.name}</h3>
        <p>{shadow.description}</p>
        <code>{value}</code>
      </div>
    </article>
  );
}

function ShadowSystem({
  description,
  name,
  shadows,
  theme,
}: {
  description: string;
  name: System;
  shadows: readonly ShadowSpecimen[];
  theme: Theme;
}) {
  return (
    <section className={styles.systemSection}>
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>{name} system</span>
          <h2>{name} shadow ramp</h2>
        </div>
        <p>{description}</p>
      </div>
      <div className={styles.swatchGrid}>
        {shadows.map((shadow) => (
          <ShadowSwatch key={shadow.name} shadow={shadow} theme={theme} />
        ))}
      </div>
    </section>
  );
}

function ContextSurface({
  kind,
  shadow,
}: {
  kind: ContextKind;
  shadow: string;
}) {
  if (kind === "raised") {
    return (
      <div className={styles.contextCanvas}>
        <div className={styles.raisedCard} style={{ boxShadow: shadow }}>
          <div className={styles.avatar}>P</div>
          <div className={styles.raisedCopy}>
            <strong>Design review</strong>
            <span>Today at 14:30</span>
          </div>
          <span className={styles.statusDot}>Ready</span>
        </div>
      </div>
    );
  }

  if (kind === "popover") {
    return (
      <div className={styles.contextCanvas}>
        <div className={styles.anchorButton}>Organize</div>
        <div className={styles.popover} style={{ boxShadow: shadow }}>
          <span className={styles.popoverLabel}>Move to</span>
          <button type="button">Inspiration</button>
          <button type="button">Projects</button>
          <button type="button">Archive</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contextCanvas}>
      <div className={styles.scrim} />
      <div className={styles.dialog} style={{ boxShadow: shadow }}>
        <span className={styles.dialogIcon}>P</span>
        <div>
          <strong>Move 12 saves?</strong>
          <p>They’ll stay available in your library.</p>
        </div>
        <div className={styles.dialogActions}>
          <button type="button">Cancel</button>
          <button className={styles.primaryAction} type="button">
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextComparison({
  description,
  kind,
  linearShadow,
  pondShadow,
  theme,
  title,
  vercelShadow,
}: ContextComparisonProps & { theme: Theme }) {
  return (
    <article className={styles.contextCard}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className={styles.contextPair}>
        <div className={styles.contextSpecimen}>
          <span className={styles.systemLabel}>Pond</span>
          <ContextSurface kind={kind} shadow={pondShadow} />
        </div>
        <div className={styles.contextSpecimen}>
          <span className={styles.systemLabel}>Linear</span>
          <ContextSurface kind={kind} shadow={linearShadow} />
        </div>
        <div className={styles.contextSpecimen}>
          <span className={styles.systemLabel}>Vercel</span>
          <ContextSurface kind={kind} shadow={vercelShadow[theme]} />
        </div>
      </div>
    </article>
  );
}

function ShadowGallery() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [backdrop, setBackdrop] = useState<Backdrop>("soft");

  const changeTheme = (nextTheme: Theme) => {
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  };

  return (
    <main className={styles.page} data-backdrop={backdrop}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Pond design system</span>
          <h1>Shadow lab</h1>
          <p>
            Compare Pond’s production elevation tokens with Linear’s core
            shadows and Vercel’s complete material system.
          </p>
        </div>
        <div className={styles.controls}>
          <SegmentedControl
            label="Theme"
            onChange={changeTheme}
            options={["light", "dark"]}
            value={theme}
          />
          <SegmentedControl
            label="Backdrop"
            onChange={setBackdrop}
            options={["soft", "plain", "contrast"]}
            value={backdrop}
          />
        </div>
      </header>

      <section className={styles.contextSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Direct comparison</span>
            <h2>Shadows in context</h2>
          </div>
          <p>
            The same interface geometry, surface, radius, and content. Only the
            shadow changes.
          </p>
        </div>
        <div className={styles.contextGrid}>
          {CONTEXTS.map((context) => (
            <ContextComparison key={context.kind} {...context} theme={theme} />
          ))}
        </div>
      </section>

      <ShadowSystem
        name="Pond"
        description="Pond’s eight production tokens, from quiet surface separation through full-window elevation."
        shadows={POND_SHADOWS}
        theme={theme}
      />
      <ShadowSystem
        name="Linear"
        description="The reusable core palette from Linear’s production web stylesheet. Names are descriptive because the shipped token names are obfuscated."
        shadows={LINEAR_SHADOWS}
        theme={theme}
      />
      <ShadowSystem
        name="Vercel"
        description="Vercel’s eight published material tiers. Their shadow stacks update with the gallery theme; radii remain constant here so elevation is directly comparable."
        shadows={VERCEL_SHADOWS}
        theme={theme}
      />

      <footer className={styles.footer}>
        <span>Linear and Vercel values inspected 25 September 2026.</span>
        <span>
          Pond API: xs · sm · md · lg · tooltip · menu · modal · fullscreen
        </span>
      </footer>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element missing");
window.__pondShadowGalleryRoot ??= createRoot(rootElement);
window.__pondShadowGalleryRoot.render(<ShadowGallery />);
