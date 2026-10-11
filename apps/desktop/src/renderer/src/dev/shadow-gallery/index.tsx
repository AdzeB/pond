import { type CSSProperties, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import "../../styles.css";
import styles from "./styles.module.css";

type Theme = "light" | "dark";
type Backdrop = "soft" | "plain" | "contrast";
type System = "Pond" | "Codex" | "Linear" | "Vercel";
type ContextKind = "raised" | "popover" | "dialog";
interface ThemeShadow {
  light: string;
  dark: string;
}

interface ShadowSpecimen {
  darkValue?: string;
  description: string;
  name: string;
  value: string;
}

interface ContextComparisonProps {
  codexShadow: ThemeShadow;
  description: string;
  kind: ContextKind;
  pondShadow: string;
  title: string;
}

interface ShadowBlend {
  codexShadow: string;
  percentage: number;
  pondShadow: string;
}

type ShadowBlendStyle = CSSProperties & {
  "--codex-shadow": string;
  "--pond-shadow": string;
  "--shadow-blend-delay": string;
};

const LINEAR_LOW_SHADOW = "0 3px 6px -2px #00000005, 0 1px 1px #0000000a";
const LINEAR_MEDIUM_SHADOW =
  "0 6px 18px #00000005, 0 3px 9px #0000000a, 0 1px 1px #0000000a";
const LINEAR_HIGH_SHADOW =
  "0 9px 48px #00000014, 0 6px 24px #00000019, 0 1px 1px #0000000a";

const CODEX_HAIRLINE_SHADOW: ThemeShadow = {
  light: "0 0 0 0.5px #0000001a",
  dark: "0 0 0 0.5px #ffffff1f",
};

const CODEX_SMALL_SHADOW: ThemeShadow = {
  light: "0 1px 2px -1px rgb(0 0 0 / 8%)",
  dark: "0 1px 2px -1px rgb(0 0 0 / 20%)",
};

const CODEX_MEDIUM_SHADOW: ThemeShadow = {
  light: "0 2px 4px -1px rgb(0 0 0 / 8%)",
  dark: "0 2px 4px -1px rgb(0 0 0 / 20%)",
};

const CODEX_LARGE_SHADOW: ThemeShadow = {
  light: "0 4px 8px -2px rgb(0 0 0 / 10%)",
  dark: "0 4px 8px -2px rgb(0 0 0 / 36%)",
};

const CODEX_XL_SHADOW: ThemeShadow = {
  light: "0 0 0 0.5px #0000001a, 0 8px 16px -4px rgb(0 0 0 / 12%)",
  dark: "0 0 0 0.5px #ffffff1f, 0 8px 16px -4px rgb(0 0 0 / 30%)",
};

const CODEX_2XL_SHADOW: ThemeShadow = {
  light: "0 16px 32px -8px #00000030",
  dark: "0 16px 32px -8px #00000030",
};

const CODEX_CARD_SHADOW: ThemeShadow = {
  light: "0 4px 16px #0000000d",
  dark: "0 4px 16px #0000000d",
};

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

const CODEX_SHADOWS: ShadowSpecimen[] = [
  {
    name: "Hairline",
    description: "The half-pixel perimeter used to separate elevated surfaces.",
    value: CODEX_HAIRLINE_SHADOW.light,
    darkValue: CODEX_HAIRLINE_SHADOW.dark,
  },
  {
    name: "Small",
    description: "The first step in the shared elevation geometry.",
    value: CODEX_SMALL_SHADOW.light,
    darkValue: CODEX_SMALL_SHADOW.dark,
  },
  {
    name: "Small stronger",
    description: "A higher-contrast variant of the smallest shadow.",
    value: "0 1px 2px -1px #00000021",
  },
  {
    name: "Medium",
    description: "A compact lift for controls and small floating surfaces.",
    value: CODEX_MEDIUM_SHADOW.light,
    darkValue: CODEX_MEDIUM_SHADOW.dark,
  },
  {
    name: "Large",
    description: "The default popover elevation before its hairline.",
    value: CODEX_LARGE_SHADOW.light,
    darkValue: CODEX_LARGE_SHADOW.dark,
  },
  {
    name: "Large stronger",
    description: "The stronger large shadow shipped beside the core ramp.",
    value: "0 4px 8px -2px #00000029",
  },
  {
    name: "XL menu",
    description: "Menu elevation composed with the product hairline.",
    value: CODEX_XL_SHADOW.light,
    darkValue: CODEX_XL_SHADOW.dark,
  },
  {
    name: "2XL modal",
    description: "The broadest named elevation, used by the command menu.",
    value: CODEX_2XL_SHADOW.light,
    darkValue: CODEX_2XL_SHADOW.dark,
  },
  {
    name: "Card",
    description: "A diffuse shadow for standalone content cards.",
    value: CODEX_CARD_SHADOW.light,
    darkValue: CODEX_CARD_SHADOW.dark,
  },
  {
    name: "Tooltip",
    description: "A compact but high-contrast floating label.",
    value: "0 8px 18px #0f172a33",
  },
  {
    name: "Composer",
    description: "The signature ambient stack around the message composer.",
    value: "0 0 0 1px #0000000a, 0 2px 8px #0000000a, 0 4px 80px 8px #00000006",
    darkValue: "inset 0 0 1px #ffffff33",
  },
  {
    name: "Prominent",
    description: "A hairline, near shadow, and soft ambient glow.",
    value: "0 0 0 0.5px #0000001a, 0 3px 7.5px #0000000a, 0 0 20px #0000000d",
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
    description: "The largest material, sharing Modal's shadow stack.",
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
    codexShadow: CODEX_CARD_SHADOW,
  },
  {
    kind: "popover",
    title: "Popover",
    description: "A temporary surface anchored above the working context.",
    pondShadow: "var(--ds-shadow-menu)",
    codexShadow: CODEX_XL_SHADOW,
  },
  {
    kind: "dialog",
    title: "Dialog",
    description: "The highest focused layer in the interface.",
    pondShadow: "var(--ds-shadow-modal)",
    codexShadow: CODEX_2XL_SHADOW,
  },
];

function readInitialTheme(): Theme {
  const currentTheme = document.documentElement.dataset.theme;
  if (currentTheme === "light" || currentTheme === "dark") {
    return currentTheme;
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

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
    <article className={styles["swatch-card"]}>
      <div className={styles["swatch-canvas"]}>
        <div className={styles.swatch} style={{ boxShadow: value }}>
          <span className={styles["swatch-mark"]} />
          <span>{shadow.name}</span>
        </div>
      </div>
      <div className={styles["swatch-details"]}>
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
    <section className={styles["system-section"]}>
      <div className={styles["section-heading"]}>
        <div>
          <span className={styles.eyebrow}>{name} system</span>
          <h2>{name} shadow ramp</h2>
        </div>
        <p>{description}</p>
      </div>
      <div className={styles["swatch-grid"]}>
        {shadows.map((shadow) => (
          <ShadowSwatch key={shadow.name} shadow={shadow} theme={theme} />
        ))}
      </div>
    </section>
  );
}

function ContextSurface({
  blend,
  kind,
  shadow,
}: {
  blend?: ShadowBlend;
  kind: ContextKind;
  shadow: string;
}) {
  const blendStyle: ShadowBlendStyle | undefined = blend
    ? {
        "--codex-shadow": blend.codexShadow,
        "--pond-shadow": blend.pondShadow,
        "--shadow-blend-delay": `-${blend.percentage}s`,
      }
    : undefined;

  const surface = (baseClassName: string | undefined) => ({
    className: [baseClassName, blend ? styles["blended-shadow"] : undefined]
      .filter(Boolean)
      .join(" "),
    style: blendStyle ?? { boxShadow: shadow },
  });

  if (kind === "raised") {
    return (
      <div className={styles["context-canvas"]}>
        <div {...surface(styles["raised-card"])}>
          <div className={styles.avatar}>P</div>
          <div className={styles["raised-copy"]}>
            <strong>Design review</strong>
            <span>Today at 14:30</span>
          </div>
          <span className={styles["status-dot"]}>Ready</span>
        </div>
      </div>
    );
  }

  if (kind === "popover") {
    return (
      <div className={styles["context-canvas"]}>
        <div className={styles["anchor-button"]}>Organize</div>
        <div {...surface(styles.popover)}>
          <span className={styles["popover-label"]}>Move to</span>
          <button type="button">Inspiration</button>
          <button type="button">Projects</button>
          <button type="button">Archive</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["context-canvas"]}>
      <div className={styles.scrim} />
      <div {...surface(styles.dialog)}>
        <span className={styles["dialog-icon"]}>P</span>
        <div>
          <strong>Move 12 saves?</strong>
          <p>They'll stay available in your library.</p>
        </div>
        <div className={styles["dialog-actions"]}>
          <button type="button">Cancel</button>
          <button className={styles["primary-action"]} type="button">
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextComparison({
  blend,
  codexShadow,
  description,
  kind,
  pondShadow,
  theme,
  title,
}: ContextComparisonProps & { blend: number; theme: Theme }) {
  const resolvedCodexShadow = codexShadow[theme];

  return (
    <article className={styles["context-card"]}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className={styles["context-pair"]}>
        <div className={styles["context-specimen"]}>
          <span className={styles["system-label"]}>Pond</span>
          <ContextSurface kind={kind} shadow={pondShadow} />
        </div>
        <div className={styles["context-specimen"]}>
          <span className={styles["system-label"]}>Blend · {blend}% Codex</span>
          <ContextSurface
            blend={{
              codexShadow: resolvedCodexShadow,
              percentage: blend,
              pondShadow,
            }}
            kind={kind}
            shadow={pondShadow}
          />
        </div>
        <div className={styles["context-specimen"]}>
          <span className={styles["system-label"]}>Codex</span>
          <ContextSurface kind={kind} shadow={resolvedCodexShadow} />
        </div>
      </div>
    </article>
  );
}

export function ShadowGallery() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [backdrop, setBackdrop] = useState<Backdrop>("soft");
  const [blend, setBlend] = useState(50);

  useEffect(() => {
    const previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = theme;
    return () => {
      if (previousTheme) {
        document.documentElement.dataset.theme = previousTheme;
      } else {
        delete document.documentElement.dataset.theme;
      }
    };
  }, [theme]);

  return (
    <main className={styles.page} data-backdrop={backdrop}>
      <header className={styles.hero}>
        <div className={styles["hero-copy"]}>
          <span className={styles.eyebrow}>Pond design system</span>
          <h1>Shadow lab</h1>
          <p>
            Compare Pond's production elevation tokens with Linear's core
            shadows, Vercel's material system, and the tokens extracted from the
            installed Codex desktop app.
          </p>
        </div>
        <div className={styles.controls}>
          <SegmentedControl
            label="Theme"
            onChange={setTheme}
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

      <section className={styles["context-section"]}>
        <div className={styles["section-heading"]}>
          <div>
            <span className={styles.eyebrow}>Direct comparison</span>
            <h2>Shadows in context</h2>
          </div>
          <p>
            The same interface geometry, surface, radius, and content. Only the
            shadow changes. The middle specimen interpolates between Pond and
            Codex.
          </p>
        </div>
        <div className={styles["blend-control"]}>
          <div className={styles["blend-heading"]}>
            <label htmlFor="shadow-blend">Pond ↔ Codex blend</label>
            <output htmlFor="shadow-blend">
              {100 - blend}% Pond / {blend}% Codex
            </output>
          </div>
          <div className={styles["blend-range"]}>
            <span>Pond</span>
            <input
              aria-valuetext={`${100 - blend}% Pond, ${blend}% Codex`}
              id="shadow-blend"
              max="100"
              min="0"
              name="shadow-blend"
              onChange={(event) => setBlend(Number(event.currentTarget.value))}
              step="1"
              type="range"
              value={blend}
            />
            <span>Codex</span>
          </div>
        </div>
        <div className={styles["context-grid"]}>
          {CONTEXTS.map((context) => (
            <ContextComparison
              blend={blend}
              key={context.kind}
              {...context}
              theme={theme}
            />
          ))}
        </div>
      </section>

      <ShadowSystem
        name="Pond"
        description="Linear's hairline and elevation geometry mapped onto Pond's semantic shadow API and adaptive gray palette."
        shadows={POND_SHADOWS}
        theme={theme}
      />
      <ShadowSystem
        name="Codex"
        description="The complete named elevation ramp and product-level composites extracted from the installed ChatGPT Codex desktop app. Theme-specific values update with the gallery theme."
        shadows={CODEX_SHADOWS}
        theme={theme}
      />
      <ShadowSystem
        name="Linear"
        description="The reusable core palette from Linear's production web stylesheet. Names are descriptive because the shipped token names are obfuscated."
        shadows={LINEAR_SHADOWS}
        theme={theme}
      />
      <ShadowSystem
        name="Vercel"
        description="Vercel's eight published material tiers. Their shadow stacks update with the gallery theme; radii remain constant here so elevation is directly comparable."
        shadows={VERCEL_SHADOWS}
        theme={theme}
      />

      <footer className={styles.footer}>
        <span>
          Codex 26.1002.52244 extracted 8 October 2026; Linear and Vercel
          inspected 25 September 2026.
        </span>
        <span>
          Pond API: xs · sm · md · lg · tooltip · menu · modal · fullscreen
        </span>
      </footer>
    </main>
  );
}

const rootElement = document.getElementById("shadow-gallery-root");
if (rootElement) {
  window.__pondShadowGalleryRoot ??= createRoot(rootElement);
  window.__pondShadowGalleryRoot.render(<ShadowGallery />);
}
