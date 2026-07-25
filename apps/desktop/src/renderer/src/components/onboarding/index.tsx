import type { Source } from "@pond/schema/db";
import { EXTERNAL_SOURCE_IDS } from "@pond/schema/sources";
import { Button, Field, Input } from "@pond/ui";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useEffect, useState } from "react";
import { SourcePicker } from "@/components/source-picker";
import { useBootReady } from "@/hooks/use-saves";
import { getSourceLogo } from "@/lib/save/sources-registry";
import {
  completeOnboarding,
  loadOnboarding,
  useOnboardingStatus,
} from "@/stores/onboarding";
import styles from "./styles.module.css";

type Step = "welcome" | "create-pond" | "connect-source";

const STEPS: Step[] = ["welcome", "create-pond", "connect-source"];

const stepVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.7, bounce: 0 },
  },
};

const stepExit = {
  opacity: 0,
  y: -12,
  filter: "blur(6px)",
  transition: { type: "spring", duration: 0.35, bounce: 0 },
} as const;

/** Media copied from the developer's own library, so the wall previews real saves offline. */
const WALL_MEDIA = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../assets/onboarding/*.{jpg,png,mp4}", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1).replace(/\.(jpg|png|mp4)$/, ""),
    url as string,
  ]),
);

interface WallItem {
  img: string;
  title: string;
  stat: string;
  source?: string;
  video?: boolean;
}

const WALL_COLUMNS: ReadonlyArray<ReadonlyArray<WallItem>> = [
  [
    {
      img: "yt-mclaren",
      title: "The Best Car I've Ever Driven: McLaren W1",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "cs-ona",
      title: "Ona interface exploration",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "ig-copenhagen",
      title: "Spring day in Copenhagen",
      stat: "Kim Andersen",
      source: "instagram",
    },
    {
      img: "ar-lemaire",
      title: "Lemaire AW25 Runway",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "pi-photo",
      title: "Portrait study",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "cs-kitchen",
      title: "Kitchen in an Altbau apartment",
      stat: "Cosmos",
      source: "cosmos",
    },
  ],
  [
    {
      img: "tw-emptystate",
      video: true,
      title: "Obsessing over this empty state",
      stat: "Jamie Barton",
      source: "twitter",
    },
    {
      img: "ig-postcards",
      title: "digital postcards <33",
      stat: "Tim Doleschall",
      source: "instagram",
    },
    {
      img: "cs-callalily",
      title: "Calla Lily (1986)",
      stat: "Robert Mapplethorpe",
      source: "cosmos",
    },
    {
      img: "yt-foldable",
      title: "So This is Peak Foldable",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "ar-taste",
      title: "Taste Genealogy",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "ig-greener",
      title: "greener and greener",
      stat: "Heo Kang",
      source: "instagram",
    },
  ],
  [
    {
      img: "pi-vogue",
      title: "Vogue",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "tw-hovermaxxing",
      video: true,
      title: "hovermaxxing",
      stat: "chance",
      source: "twitter",
    },
    {
      img: "cs-lamp",
      title: "w202 Halo lamp by Wästberg",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "web-amie",
      title: "Amie, AI Note Taker",
      stat: "amie.so",
    },
    {
      img: "pi-akikuma",
      title: "Akikuma mini album",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "ig-blessings",
      title: "more blessings more life",
      stat: "BIN",
      source: "instagram",
    },
  ],
  [
    {
      img: "tw-popover",
      video: true,
      title: "Base UI Popover with detached triggers",
      stat: "Colm Tuite",
      source: "twitter",
    },
    {
      img: "yt-becoming",
      title: "The Pain of Becoming",
      stat: "Josephine",
      source: "youtube",
    },
    {
      img: "ar-pacome",
      title: "Pacôme Pertant, Portfolio",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "cs-dunes",
      title: "Singing Sand Mountain, Dunhuang",
      stat: "Lynn Davis",
      source: "cosmos",
    },
    {
      img: "pi-kleerkasten",
      title: "Kleerkasten",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "ig-copenhagen",
      title: "Spring day in Copenhagen",
      stat: "Kim Andersen",
      source: "instagram",
    },
  ],
  [
    {
      img: "cs-kitchen",
      title: "Kitchen in an Altbau apartment",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "tw-tooltip",
      video: true,
      title: "Farewell to the ugly native tooltip",
      stat: "zanwei.guo",
      source: "twitter",
    },
    {
      img: "ar-lemaire",
      title: "Lemaire AW25 Runway",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "ig-postcards",
      title: "digital postcards <33",
      stat: "Tim Doleschall",
      source: "instagram",
    },
    {
      img: "yt-mclaren",
      title: "The Best Car I've Ever Driven: McLaren W1",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "pi-vogue",
      title: "Vogue",
      stat: "Pinterest",
      source: "pinterest",
    },
  ],
  [
    {
      img: "ig-greener",
      title: "greener and greener",
      stat: "Heo Kang",
      source: "instagram",
    },
    {
      img: "cs-callalily",
      title: "Calla Lily (1986)",
      stat: "Robert Mapplethorpe",
      source: "cosmos",
    },
    {
      img: "tw-emptystate",
      video: true,
      title: "Obsessing over this empty state",
      stat: "Jamie Barton",
      source: "twitter",
    },
    {
      img: "pi-akikuma",
      title: "Akikuma mini album",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "web-amie",
      title: "Amie, AI Note Taker",
      stat: "amie.so",
    },
    {
      img: "cs-ona",
      title: "Ona interface exploration",
      stat: "Cosmos",
      source: "cosmos",
    },
  ],
  [
    {
      img: "ar-taste",
      title: "Taste Genealogy",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "yt-foldable",
      title: "So This is Peak Foldable",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "pi-photo",
      title: "Portrait study",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "tw-hovermaxxing",
      video: true,
      title: "hovermaxxing",
      stat: "chance",
      source: "twitter",
    },
    {
      img: "cs-dunes",
      title: "Singing Sand Mountain, Dunhuang",
      stat: "Lynn Davis",
      source: "cosmos",
    },
    {
      img: "ig-blessings",
      title: "more blessings more life",
      stat: "BIN",
      source: "instagram",
    },
  ],
  [
    {
      img: "cs-lamp",
      title: "w202 Halo lamp by Wästberg",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "ar-pacome",
      title: "Pacôme Pertant, Portfolio",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "tw-tooltip",
      video: true,
      title: "Farewell to the ugly native tooltip",
      stat: "zanwei.guo",
      source: "twitter",
    },
    {
      img: "yt-becoming",
      title: "The Pain of Becoming",
      stat: "Josephine",
      source: "youtube",
    },
    {
      img: "pi-kleerkasten",
      title: "Kleerkasten",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "cs-kitchen",
      title: "Kitchen in an Altbau apartment",
      stat: "Cosmos",
      source: "cosmos",
    },
  ],
];

function SourceBadge({ source }: { source: string }) {
  const logo = getSourceLogo(source);
  if (!logo) return null;
  return (
    <span className={styles["ghost-badge"]}>
      <img src={logo} alt="" width={18} height={18} draggable={false} />
    </span>
  );
}

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function WallCard({ item, delay }: { item: WallItem; delay: number }) {
  return (
    <motion.div
      className={styles.ghost}
      initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", duration: 0.9, bounce: 0, delay },
      }}
    >
      <div className={styles["ghost-frame"]}>
        {item.video ? (
          <video
            className={styles["ghost-art"]}
            src={WALL_MEDIA[item.img]}
            poster={WALL_MEDIA[`${item.img}-poster`]}
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            disablePictureInPicture
          />
        ) : (
          <img
            className={styles["ghost-art"]}
            src={WALL_MEDIA[item.img]}
            alt=""
            draggable={false}
          />
        )}
        {item.source ? <SourceBadge source={item.source} /> : null}
      </div>
      <div className={styles["ghost-meta"]}>
        <span className={styles["ghost-title"]}>{item.title}</span>
        <span className={styles["ghost-stat"]}>{item.stat}</span>
      </div>
    </motion.div>
  );
}

function Wall() {
  return (
    <div className={styles.wall} aria-hidden>
      {WALL_COLUMNS.map((cards, col) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative list
          key={col}
          className={styles["wall-column"]}
          data-direction={col % 2 === 0 ? "up" : "down"}
        >
          {[0, 1].map((half) => (
            <div key={half} className={styles["wall-half"]}>
              {cards.map((item, i) => (
                <WallCard
                  // biome-ignore lint/suspicious/noArrayIndexKey: static decorative list
                  key={i}
                  item={item}
                  delay={0.1 + col * 0.07 + i * 0.05}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Step 1: Welcome ─── */

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.span className={styles.mark} variants={rise} aria-hidden>
        <span className={styles["mark-ring"]} />
      </motion.span>
      <motion.h1 className={styles.title} variants={rise}>
        Your library awaits.
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Pond is a calm, local home for everything worth keeping. Links, images,
        videos, and files, saved on your Mac.
      </motion.p>
      <motion.div className={styles.actions} variants={rise}>
        <Button variant="accent" size="lg" onClick={onNext} width="full">
          Get Started
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Step 2: Create Your Pond ─── */

function CreatePondStep({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState("My Pond");
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.pond
      .query("library.info", {})
      .then((info) => {
        const root = (info as { path?: string })?.path ?? "";
        const parent = root.replace(/\/[^/]+\.pond\/?$/, "");
        if (parent) setFolder(parent);
        else setFolder("~/Pond");
      })
      .catch(() => {
        setFolder("~/Pond");
      });
  }, []);

  const pickFolder = async () => {
    const res = (await window.pond.query("library.pickFolder", {})) as {
      ok: boolean;
      path?: string;
    };
    if (res.ok && res.path) setFolder(res.path);
  };

  const create = async () => {
    if (!name.trim() || !folder.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await window.pond.query("library.createAt", {
        name: name.trim(),
        path: folder.trim(),
      })) as { ok: boolean; reason?: string };
      if (res.ok) {
        onNext();
      } else {
        setError(
          res.reason === "not_writable"
            ? "That folder isn't writable. Pick another location."
            : "Couldn't create the pond. Try a different folder.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      key="create-pond"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.h1 className={styles.title} variants={rise}>
        Create Your Pond
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Give it a name and choose where it lives on your Mac.
      </motion.p>
      <motion.div className={styles["form-fields"]} variants={rise}>
        <Field.Root>
          <Field.Label>Name</Field.Label>
          <Input.Root size="lg" variant="secondary">
            <Input.Field
              value={name}
              placeholder="My Pond"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void create();
                }
              }}
            />
          </Input.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label>Location</Field.Label>
          <Input.Root size="lg" variant="secondary">
            <Input.Field
              value={folder}
              placeholder="~/Pond"
              readOnly
              onClick={() => void pickFolder()}
              style={{ cursor: "pointer" }}
            />
          </Input.Root>
        </Field.Root>
      </motion.div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <motion.div className={styles.actions} variants={rise}>
        <Button
          variant="accent"
          size="lg"
          disabled={!name.trim() || !folder.trim() || busy}
          onClick={() => void create()}
          width="full"
        >
          {busy ? "Creating..." : "Continue"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Step 3: Connect Your First Source ─── */

function ConnectSourceStep({ onDone }: { onDone: () => void }) {
  const [connecting, setConnecting] = useState<Source | null>(null);

  const handlePick = (source: Source) => {
    setConnecting(source);
    void window.pond.connectSource(source);
  };

  return (
    <motion.div
      key="connect-source"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.h1 className={styles.title} variants={rise}>
        Connect a Source
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Pick a platform to sync your saves from. You'll sign in through your
        browser, and the extension sends your session to Pond.
      </motion.p>
      <motion.div className={styles["source-grid-wrap"]} variants={rise}>
        {connecting ? (
          <div className={styles["connect-waiting"]}>
            <span className={styles["connect-waiting-ring"]} />
            <span className={styles["connect-waiting-text"]}>
              Waiting for sign-in...
            </span>
            <button
              type="button"
              className={styles.skip}
              onClick={() => setConnecting(null)}
            >
              Try another
            </button>
          </div>
        ) : (
          <SourcePicker sources={EXTERNAL_SOURCE_IDS} onPick={handlePick} />
        )}
      </motion.div>
      <motion.button
        type="button"
        className={styles.skip}
        variants={rise}
        onClick={onDone}
      >
        I'll set this up later
      </motion.button>
    </motion.div>
  );
}

/* ─── Main Onboarding Orchestrator ─── */

function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const currentIdx = STEPS.indexOf(step);

  return (
    <motion.div
      className={styles.overlay}
      role="dialog"
      aria-label="Welcome to Pond"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeOut" } }}
    >
      <div className={styles.drag} aria-hidden />
      <div className={styles["panel-left"]}>
        <span className={styles["step-counter"]}>
          {currentIdx + 1}/{STEPS.length}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          {step === "welcome" ? (
            <WelcomeStep onNext={() => setStep("create-pond")} />
          ) : step === "create-pond" ? (
            <CreatePondStep onNext={() => setStep("connect-source")} />
          ) : (
            <ConnectSourceStep onDone={onDone} />
          )}
        </AnimatePresence>
      </div>
      <div className={styles["panel-right"]} aria-hidden>
        <Wall />
      </div>
    </motion.div>
  );
}

/** Shows onboarding on a fresh library; libraries that already have saves are marked onboarded silently. */
export function OnboardingGate() {
  const status = useOnboardingStatus();
  const bootReady = useBootReady();
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    loadOnboarding();
  }, []);

  useEffect(() => {
    if (show !== null) return;
    if (status === "unknown" || !bootReady) return;
    if (status === "done") {
      setShow(false);
      return;
    }
    setShow(true);
  }, [show, status, bootReady]);

  const done = () => {
    completeOnboarding();
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show ? <Onboarding onDone={done} /> : null}
    </AnimatePresence>
  );
}
