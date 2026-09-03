import { Logo } from "@pond/ui/logo";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  comparison,
  palette,
  prompts,
  type Save,
  type Scene,
  saves,
  scenes,
  type Variant,
  variants,
} from "./fixtures";
import * as I from "./icons";

type Surface = "page" | "side";
type Turn = { id: number; prompt: string; scene: Scene };
type ReviewState = "pending" | "applied" | "dismissed";
type Actions = { open: (save: Save) => void; attach: (save: Save) => void };

function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

function Artwork({ save }: { save: Save }) {
  return save.image ? (
    <img src={save.image} alt={save.title} loading="lazy" />
  ) : (
    <span className="note-art">
      <I.File />
      <span>{save.note}</span>
      <small>Personal note</small>
    </span>
  );
}

function SaveCard({
  save,
  open,
  attach,
  attached = false,
}: Actions & { save: Save; attached?: boolean }) {
  return (
    <article className="save-card">
      <button
        type="button"
        className="save-open"
        onClick={() => open(save)}
        aria-label={`Open ${save.title}`}
      >
        <span className="save-art">
          <Artwork save={save} />
        </span>
        <strong>{save.title}</strong>
        <small>{save.domain}</small>
      </button>
      <button
        type="button"
        className="save-attach"
        onClick={() => attach(save)}
        aria-label={`Add ${save.title} to message`}
        title={attached ? "Already Added" : "Add to Message"}
      >
        {attached ? <I.Check /> : <I.Plus />}
      </button>
    </article>
  );
}

function Citation({
  save,
  children,
  open,
  attach,
}: Actions & { save: Save; children?: ReactNode }) {
  const [position, setPosition] = useState<{
    left: number;
    top?: number;
    bottom?: number;
  }>();
  const button = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const hide = () => {
    closeTimer.current = setTimeout(() => setPosition(undefined), 140);
  };
  const keep = () => clearTimeout(closeTimer.current);
  const show = () => {
    keep();
    const rect = button.current?.getBoundingClientRect();
    setPosition({
      left: Math.max(12, Math.min(rect.left - 110, window.innerWidth - 277)),
      ...(rect.top > 215
        ? { bottom: window.innerHeight - rect.top + 7 }
        : { top: rect.bottom + 7 }),
    });
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  return (
    <span className="citation-wrap">
      <button
        ref={button}
        type="button"
        className="citation"
        aria-label={`Open source ${save.id}: ${save.title}`}
        aria-expanded={!!position}
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={() => {
          setPosition(undefined);
          open(save);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setPosition(undefined);
        }}
      >
        {children || save.id}
      </button>
      {position
        ? createPortal(
            <span
              className="citation-popover"
              style={position}
              role="dialog"
              aria-label="Source preview"
              onMouseEnter={keep}
              onMouseLeave={hide}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setPosition(undefined);
                  button.current?.focus();
                }
              }}
            >
              <span className="source-top">
                <button
                  type="button"
                  className="source-thumb"
                  aria-label={`Open ${save.title}`}
                  onClick={() => {
                    setPosition(undefined);
                    open(save);
                  }}
                >
                  <Artwork save={save} />
                </button>
                <span>
                  <small>{save.domain}</small>
                  <strong>{save.title}</strong>
                </span>
              </span>
              <span className="source-note">{save.note}</span>
              <span className="source-buttons">
                <button
                  type="button"
                  onClick={() => {
                    setPosition(undefined);
                    open(save);
                  }}
                >
                  Open Save <I.Open />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    attach(save);
                    setPosition(undefined);
                  }}
                >
                  <I.Plus /> Add to Message
                </button>
              </span>
            </span>,
            document.querySelector(".prototype")!,
          )
        : null}
    </span>
  );
}

function Prose({ content, ...actions }: Actions & { content: string }) {
  return (
    <div className="prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const save = saves.find((item) => `#save-${item.id}` === href);
            return save ? (
              <Citation save={save} {...actions}>
                {children}
              </Citation>
            ) : (
              <span>{children}</span>
            );
          },
          table: ({ children }) => (
            <div className="table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

function Activity() {
  return (
    <details className="activity">
      <summary>
        <I.Check />
        <span>Searched your library</span>
        <I.Down />
      </summary>
      <div className="activity-steps">
        <span>
          <I.Check /> Search sample library <small>6 Saves</small>
        </span>
        <span>
          <I.Check /> Read descriptions and notes <small>Complete</small>
        </span>
        <span>
          <I.Check /> Prepare references <small>Complete</small>
        </span>
      </div>
    </details>
  );
}

function SaveStrip({ attached, ...actions }: Actions & { attached: number[] }) {
  const [expanded, setExpanded] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  return (
    <section className="save-strip" aria-label="Referenced Saves">
      <div ref={rail} className={expanded ? "save-grid" : "save-rail"}>
        {(expanded ? saves : saves.slice(0, 4)).map((save) => (
          <SaveCard
            key={save.id}
            save={save}
            {...actions}
            attached={attached.includes(save.id)}
          />
        ))}
      </div>
      <div className="strip-controls">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? "Show Less" : "View All 6 Saves"}
          <I.Down />
        </button>
        <div>
          {!expanded ? (
            <>
              <IconButton
                label="Previous Saves"
                onClick={() =>
                  rail.current?.scrollBy({ left: -200, behavior: "smooth" })
                }
              >
                <I.ArrowLeft />
              </IconButton>
              <IconButton
                label="Next Saves"
                onClick={() =>
                  rail.current?.scrollBy({ left: 200, behavior: "smooth" })
                }
              >
                <I.ArrowRight />
              </IconButton>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function VariantInline(props: Actions & { attached: number[] }) {
  return (
    <div className="inline-output">
      <Prose
        {...props}
        content={
          "Start with **texture, low forms, and room to breathe**. These references share a quiet material palette without feeling empty."
        }
      />
      <SaveStrip {...props} />
      <Prose
        {...props}
        content={
          "I'd pair **Cloister House** for the atmosphere [1](#save-1) with the **M_001 Chair** for a single sculptural focal point [2](#save-2)."
        }
      />
    </div>
  );
}

export function VariantEditorial(props: Actions & { attached: number[] }) {
  return (
    <div className="editorial-output">
      <div className="editorial-intro">
        <small>FROM YOUR REFERENCES</small>
        <h2>
          Quiet spaces,
          <br />
          with something to hold onto.
        </h2>
        <p>
          Three observations for a tactile interior. Keep the palette restrained
          and give each object a little more space.
        </p>
      </div>
      <button
        type="button"
        className="editorial-hero"
        onClick={() => props.open(saves[0])}
      >
        <Artwork save={saves[0]} />
        <span>
          <small>01 / ATMOSPHERE</small>
          <strong>Let the walls carry the texture.</strong>
          <span>
            The Cloister House <I.Open />
          </span>
        </span>
      </button>
      <div className="editorial-observation">
        <div>
          <small>02 / FORM</small>
          <h3>Choose one strong object.</h3>
          <Prose
            {...props}
            content={
              "The M_001's solid form gives the eye somewhere to settle. Leave space around it instead of adding another accent. [2](#save-2)"
            }
          />
        </div>
        <SaveCard
          save={saves[1]}
          {...props}
          attached={props.attached.includes(2)}
        />
      </div>
      <div className="editorial-observation">
        <div>
          <small>03 / CONTRAST</small>
          <h3>Warmth does not need more color.</h3>
          <Prose
            {...props}
            content={
              "A lighter chair against raw concrete changes the feeling of the whole room. Let materials and daylight make the contrast. [5](#save-5)"
            }
          />
        </div>
        <SaveCard
          save={saves[4]}
          {...props}
          attached={props.attached.includes(5)}
        />
      </div>
    </div>
  );
}

export function VariantCanvas(props: Actions & { onShowBoard: () => void }) {
  return (
    <div className="canvas-output">
      <Prose
        {...props}
        content={
          "I've pulled together a reference board around **quiet materials and sculptural forms**."
        }
      />
      <button
        type="button"
        className="board-object"
        onClick={props.onShowBoard}
      >
        <span className="board-stack">
          {saves.slice(0, 3).map((save) => (
            <img key={save.id} src={save.image} alt="" />
          ))}
        </span>
        <span>
          <strong>Quiet interiors</strong>
          <small>6 Saves · Reference board</small>
        </span>
        <I.Open />
      </button>
      <Prose
        {...props}
        content={
          "**Two useful threads**\n\n- **Atmosphere:** textured walls, softened light, low seating. [1](#save-1)\n- **Form:** a strong silhouette with space around it. [2](#save-2)\n\nThe board stays beside this conversation as we refine the direction."
        }
      />
    </div>
  );
}

function Review({
  state,
  setState,
  selected,
  setSelected,
  open,
}: {
  state: ReviewState;
  setState: (state: ReviewState) => void;
  selected: number[];
  setSelected: React.Dispatch<React.SetStateAction<number[]>>;
  open: Actions["open"];
}) {
  if (state !== "pending")
    return (
      <div className="resolved-card">
        <span>
          <I.Check />
          {state === "applied"
            ? "Added to Quiet interiors"
            : "Changes dismissed"}
          <small>
            {state === "applied"
              ? `${selected.length} sample Saves updated`
              : "No sample Saves changed"}
          </small>
        </span>
        <button type="button" onClick={() => setState("pending")}>
          {state === "applied" ? "Undo" : "Review Again"}
        </button>
      </div>
    );
  return (
    <section className="review-card" aria-label="Review proposed changes">
      <header>
        <span className="folder-icon">
          <I.Folder />
        </span>
        <div>
          <strong>Quiet interiors</strong>
          <small>New folder · Add the tag "Quiet spaces"</small>
        </div>
      </header>
      <div className="review-items">
        {saves.map((save) => (
          <label key={save.id}>
            <input
              type="checkbox"
              checked={selected.includes(save.id)}
              onChange={() =>
                setSelected((previous) =>
                  previous.includes(save.id)
                    ? previous.filter((id) => id !== save.id)
                    : [...previous, save.id],
                )
              }
            />
            <span>{save.title}</span>
            <button
              type="button"
              aria-label={`Preview ${save.title}`}
              onClick={() => open(save)}
            >
              <I.Open />
            </button>
          </label>
        ))}
      </div>
      <footer>
        <span>{selected.length} Saves selected</span>
        <button
          type="button"
          className="quiet-button"
          onClick={() => setState("dismissed")}
        >
          Dismiss
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!selected.length}
          onClick={() => setState("applied")}
        >
          Apply Changes
        </button>
      </footer>
    </section>
  );
}

function Question({ onContinue }: { onContinue: (text: string) => void }) {
  const [choice, setChoice] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const options = [
    "Warm and tactile",
    "Dark and architectural",
    "A little of both",
  ];
  return (
    <section className="question-card" aria-label="Choose a direction">
      <h3>Which direction feels closer?</h3>
      <p>That will help narrow the references.</p>
      <div>
        {options.map((option, index) => (
          <button
            type="button"
            aria-pressed={choice === option}
            disabled={submitted}
            key={option}
            onClick={() => setChoice(option)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const next = (index + (event.key === "ArrowDown" ? 1 : 2)) % 3;
                setChoice(options[next]);
                (
                  event.currentTarget.parentElement?.children[
                    next
                  ] as HTMLButtonElement
                )?.focus();
              }
            }}
          >
            <span>{index + 1}</span>
            {option}
            {choice === option ? <I.Check /> : null}
          </button>
        ))}
      </div>
      <footer>
        <button
          type="button"
          className="quiet-button"
          onClick={() =>
            onContinue("I'd like to describe a different direction.")
          }
        >
          Write My Own
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!choice || submitted}
          onClick={() => {
            setSubmitted(true);
            onContinue(choice!);
          }}
        >
          {submitted ? "Added to Message" : "Use This Direction"}
          <I.ArrowRight />
        </button>
      </footer>
    </section>
  );
}

function Palette() {
  const [copied, setCopied] = useState(false);
  return (
    <details className="palette">
      <summary>
        <span className="swatches">
          {["#b5afa3", "#e9e5dc", "#78634e", "#31332e"].map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
        </span>
        <span>A starting palette</span>
        <I.Down />
      </summary>
      <div className="code-heading">
        <span>CSS</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(palette)
              .then(() => setCopied(true));
          }}
        >
          {copied ? <I.Check /> : <I.Copy />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{palette}</code>
      </pre>
    </details>
  );
}

function SaveDetail({
  save,
  back,
  attach,
  applied,
  attached,
}: {
  save: Save;
  back: () => void;
  attach: Actions["attach"];
  applied: boolean;
  attached: boolean;
}) {
  return (
    <section className="save-detail-page" aria-label="Save detail">
      <header className="save-detail-header">
        <IconButton label="Back from Save detail" onClick={back}>
          <I.ArrowLeft />
        </IconButton>
        <span>Library</span>
        <span className="detail-separator">/</span>
        <strong>{save.title}</strong>
        {save.url ? (
          <a
            href={save.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open original source"
          >
            <I.Open />
          </a>
        ) : null}
      </header>
      <div className="save-detail-content">
        <div className="save-detail-viewer">
          <Artwork save={save} />
        </div>
        <aside className="save-detail-inspector" aria-label="Save details">
          <h2>Details</h2>
          <h3>{save.title}</h3>
          <dl>
            <div>
              <dt>Author</dt>
              <dd>{save.creator}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                {save.url ? (
                  <a href={save.url} target="_blank" rel="noreferrer">
                    {save.domain} <I.Open />
                  </a>
                ) : (
                  save.domain
                )}
              </dd>
            </div>
          </dl>
          <div className="detail-tags">
            <span>Tags</span>
            <div className="tags">
              {[...save.tags, ...(applied ? ["Quiet spaces"] : [])].map(
                (tag) => (
                  <span key={tag}>{tag}</span>
                ),
              )}
            </div>
          </div>
          <div className="detail-note">
            <small>Sample note</small>
            <p>{save.note}</p>
          </div>
          <button
            type="button"
            className="quiet-button"
            onClick={() => attach(save)}
          >
            {attached ? <I.Check /> : <I.Plus />}
            {attached ? "Added to Message" : "Add to Message"}
          </button>
        </aside>
      </div>
    </section>
  );
}

function saveFromPath() {
  const id = location.pathname.match(/^\/save\/(\d+)\/?$/)?.[1];
  return saves.find((save) => String(save.id) === id);
}

export function Prototype() {
  const initial = new URLSearchParams(location.search);
  const [variant, setVariant] = useState<Variant>(
    variants.find((item) => item.key === initial.get("variant"))?.key ??
      "inline",
  );
  const [surface, setSurface] = useState<Surface>(
    initial.get("surface") === "side" ? "side" : "page",
  );
  const [scene, setScene] = useState<Scene>(
    scenes.find((item) => item === initial.get("scene")) ?? "search",
  );
  const [turns, setTurns] = useState<Turn[]>(
    scene === "empty" ? [] : [{ id: 1, prompt: prompts[scene], scene }],
  );
  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState<number[]>([]);
  const [quote, setQuote] = useState("");
  const [saveOpen, setSaveOpen] = useState<Save | undefined>(saveFromPath);
  const [review, setReview] = useState<ReviewState>("pending");
  const [selectedSaves, setSelectedSaves] = useState(
    saves.map((save) => save.id),
  );
  const [sideClosed, setSideClosed] = useState(false);
  const [busy, setBusy] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [menu, setMenu] = useState<"actions" | "saves" | "model" | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [canvasTab, setCanvasTab] = useState<"answer" | "board">("answer");
  const [notice, setNotice] = useState("");
  const [inspect, setInspect] = useState(false);
  const [dark, setDark] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const previousTurnCount = useRef(turns.length);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trigger = draft.match(/(?:^|\s)([@/])([^\n]*)$/);
  const menuQuery = trigger?.[2]?.toLowerCase() ?? "";

  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("variant", variant);
    url.searchParams.set("surface", surface);
    url.searchParams.set("scene", scene);
    history.replaceState(history.state, "", url);
  }, [variant, surface, scene]);
  useEffect(() => {
    const syncDetail = () => setSaveOpen(saveFromPath());
    window.addEventListener("popstate", syncDetail);
    return () => window.removeEventListener("popstate", syncDetail);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 2400);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    const appended = turns.length > previousTurnCount.current;
    previousTurnCount.current = turns.length;
    thread.current?.scrollTo({
      top: appended || busy ? thread.current.scrollHeight : 0,
      behavior: appended || busy ? "smooth" : "instant",
    });
  }, [turns, busy]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(
          "input, textarea, select, [contenteditable], dialog, [role=radiogroup]",
        )
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setVariant(
          (previous) =>
            variants[
              (variants.findIndex((item) => item.key === previous) +
                (event.key === "ArrowRight" ? 1 : 2)) %
                3
            ].key,
        );
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  const attach = (save: Save) => {
    setAttached((previous) =>
      previous.includes(save.id) ? previous : [...previous, save.id],
    );
    setNotice(`Added ${save.title} to the message`);
  };
  const openSave = (save: Save) => {
    if (saveOpen?.id !== save.id)
      history.pushState(
        { prototypeSave: true },
        "",
        `/save/${save.id}${location.search}`,
      );
    setSaveOpen(save);
    setMenu(null);
    setHistoryOpen(false);
  };
  const leaveDetail = () => {
    history.pushState(null, "", `/${location.search}`);
    setSaveOpen(undefined);
  };
  const backFromSave = () => {
    if (history.state?.prototypeSave) history.back();
    else leaveDetail();
  };
  const actions: Actions = { open: openSave, attach };
  const insert = (text: string) => {
    setDraft(
      (previous) => `${previous.trim()}${previous.trim() ? "\n\n" : ""}${text}`,
    );
    setMenu(null);
    input.current?.focus();
  };
  const switchScene = (next: Scene) => {
    if (saveOpen) leaveDetail();
    previousTurnCount.current = next === "empty" ? 0 : 1;
    clearTimeout(timer.current);
    setBusy("");
    setPendingPrompt("");
    setScene(next);
    setTurns(
      next === "empty"
        ? []
        : [{ id: Date.now(), prompt: prompts[next], scene: next }],
    );
    setReview("pending");
    setSelectedSaves(saves.map((save) => save.id));
    setSideClosed(false);
    setHistoryOpen(false);
    setCanvasTab("answer");
    setMenu(null);
  };
  const newChat = () => {
    switchScene("empty");
    setDraft("");
    setAttached([]);
    setQuote("");
    input.current?.focus();
  };
  const send = () => {
    if (!draft.trim() || busy) return;
    const prompt = draft.trim();
    const nextScene: Scene = /compar|palette/i.test(prompt)
      ? "compare"
      : /organiz|folder|tag/i.test(prompt)
        ? "organize"
        : /narrow|direction/i.test(prompt)
          ? "question"
          : "search";
    setPendingPrompt(prompt);
    setDraft("");
    setMenu(null);
    setBusy("Searching the sample library");
    timer.current = setTimeout(() => {
      setBusy("Reading sample Saves");
      timer.current = setTimeout(() => {
        setTurns((previous) => [
          ...previous,
          { id: Date.now(), prompt, scene: nextScene },
        ]);
        setScene(nextScene);
        setBusy("");
        setPendingPrompt("");
        setQuote("");
        setAttached([]);
      }, 800);
    }, 700);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setBusy("");
    setDraft((previous) => previous || pendingPrompt);
    setPendingPrompt("");
    setNotice("Stopped. Your message is back in the composer.");
  };
  const menuItems =
    menu === "saves"
      ? saves
          .filter((save) =>
            `${save.title} ${save.domain}`.toLowerCase().includes(menuQuery),
          )
          .map((save) => ({
            id: String(save.id),
            label: save.title,
            description: save.domain,
            icon: (
              <span className="menu-thumb">
                <Artwork save={save} />
              </span>
            ),
            action: () => {
              attach(save);
              setDraft((previous) =>
                previous.replace(/(?:^|\s)@[^\n]*$/, "").trimEnd(),
              );
              setMenu(null);
              input.current?.focus();
            },
          }))
      : [
          {
            id: "attach",
            label: "Attach Saves",
            description: "Add references from your library",
            icon: <I.Link />,
            action: () => {
              setDraft((previous) =>
                previous.replace(/(?:^|\s)\/[^\n]*$/, "").trimEnd(),
              );
              setMenu("saves");
              setMenuIndex(0);
              input.current?.focus();
            },
          },
          {
            id: "compare",
            label: "Compare",
            description: "Look at similarities and differences",
            icon: <I.Panel />,
            action: () => {
              setDraft(
                "Compare these references. What should I take from each?",
              );
              setAttached([1, 2, 3, 4]);
              setMenu(null);
              input.current?.focus();
            },
          },
          {
            id: "organize",
            label: "Organize",
            description: "Review a folder and tag proposal",
            icon: <I.Folder />,
            action: () => {
              setDraft(prompts.organize);
              setMenu(null);
              input.current?.focus();
            },
          },
          {
            id: "direction",
            label: "Narrow the Direction",
            description: "Choose what to explore next",
            icon: <I.Search />,
            action: () => {
              setDraft(prompts.question);
              setMenu(null);
              input.current?.focus();
            },
          },
        ].filter((item) =>
          `${item.label} ${item.description}`.toLowerCase().includes(menuQuery),
        );

  const composer = (
    <div
      className={`composer-wrap ${!turns.length && !busy ? "is-empty" : ""}`}
    >
      {quote ? (
        <div className="quote-context">
          <I.Chat />
          <span>
            Replying to <strong>{quote}</strong>
          </span>
          <IconButton
            label="Remove quoted context"
            onClick={() => setQuote("")}
          >
            <I.Close />
          </IconButton>
        </div>
      ) : null}
      <div className="composer">
        {attached.length ? (
          <div className="attachments">
            {attached.map((id) => {
              const save = saves.find((item) => item.id === id)!;
              return (
                <span className="attachment" key={id}>
                  <span>
                    <Artwork save={save} />
                  </span>
                  <strong>{save.title}</strong>
                  <IconButton
                    label={`Remove ${save.title} attachment`}
                    onClick={() =>
                      setAttached((previous) =>
                        previous.filter((item) => item !== id),
                      )
                    }
                  >
                    <I.Close />
                  </IconButton>
                </span>
              );
            })}
          </div>
        ) : null}
        <textarea
          ref={input}
          value={draft}
          aria-label="Message the assistant"
          placeholder="Ask anything about your library"
          rows={2}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            const match = value.match(/(?:^|\s)([@/])([^\n]*)$/);
            setMenu(match ? (match[1] === "@" ? "saves" : "actions") : null);
            setMenuIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (menu && menu !== "model") {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setMenuIndex(
                  (previous) =>
                    (previous +
                      (event.key === "ArrowDown"
                        ? 1
                        : Math.max(0, menuItems.length - 1))) %
                    Math.max(1, menuItems.length),
                );
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setMenu(null);
                return;
              }
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                menuItems.length
              ) {
                event.preventDefault();
                menuItems[menuIndex % menuItems.length].action();
                return;
              }
            }
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <div className="composer-toolbar">
          <IconButton
            label="Add context or action"
            aria-expanded={menu === "actions"}
            onClick={() => {
              setMenu(menu === "actions" ? null : "actions");
              setMenuIndex(0);
            }}
          >
            <I.Plus />
          </IconButton>
          <button
            type="button"
            className="model-button"
            aria-expanded={menu === "model"}
            onClick={() => setMenu(menu === "model" ? null : "model")}
          >
            Ollama <I.Down />
          </button>
          <span className="composer-spacer" />
          <span className="input-hint">@ context &nbsp; / actions</span>
          <button
            type="button"
            className={`send-button ${busy ? "stop" : ""}`}
            aria-label={busy ? "Stop reply" : "Send message"}
            disabled={!busy && !draft.trim()}
            onClick={busy ? stop : send}
          >
            {busy ? <span /> : <I.ArrowRight />}
          </button>
        </div>
      </div>
      {menu ? (
        <div
          className="composer-menu"
          role="dialog"
          aria-label={
            menu === "saves"
              ? "Attach Saves"
              : menu === "model"
                ? "Prototype model"
                : "Assistant actions"
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") setMenu(null);
          }}
        >
          <header>
            <span>
              {menu === "saves"
                ? "Saves from Your Library"
                : menu === "model"
                  ? "Ollama"
                  : "Actions"}
            </span>
            <IconButton label="Close actions" onClick={() => setMenu(null)}>
              <I.Close />
            </IconButton>
          </header>
          {menu === "model" ? (
            <p className="model-notice">
              This prototype uses scripted replies. No model is connected and
              nothing leaves the prototype.
            </p>
          ) : menuItems.length ? (
            menuItems.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={index === menuIndex ? "highlighted" : ""}
                onMouseEnter={() => setMenuIndex(index)}
                onClick={item.action}
              >
                {item.icon}
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                {index === menuIndex ? (
                  <span className="enter-key">↵</span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="model-notice">No matching Saves.</p>
          )}
        </div>
      ) : null}
    </div>
  );

  const board = (
    <aside className="reference-board" aria-label="Reference board">
      <header>
        <div>
          <small>REFERENCE BOARD</small>
          <h2>Quiet interiors</h2>
        </div>
        <span>6 Saves</span>
      </header>
      <div className="board-grid">
        {saves.map((save) => (
          <SaveCard
            key={save.id}
            save={save}
            {...actions}
            attached={attached.includes(save.id)}
          />
        ))}
      </div>
      <button
        type="button"
        className="board-attach-all"
        onClick={() => {
          setAttached(saves.map((save) => save.id));
          setNotice("Added all six sample Saves to the message");
        }}
      >
        <I.Plus /> Use These Saves
      </button>
    </aside>
  );

  return (
    <div className={`prototype ${dark ? "dark" : ""}`}>
      <div className="prototype-topline">
        <span>
          <span className="prototype-dot" /> Interactive prototype{" "}
          <span className="topline-detail">
            · Scripted replies, sample Saves
          </span>
        </span>
        <div>
          <a href="/references.html" target="_blank" rel="noreferrer">
            Design References <I.Open />
          </a>
          <button type="button" onClick={() => setDark(!dark)}>
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>
      <div className={`app-window ${surface === "side" ? "is-side" : ""}`}>
        <aside className="app-sidebar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <div className="brand">
            <Logo size={20} />
            <strong>Pond</strong>
            <I.Down />
          </div>
          <nav aria-label="Pond navigation">
            <button
              type="button"
              className={surface === "side" ? "selected" : ""}
              onClick={() => {
                if (saveOpen) leaveDetail();
                setSurface("side");
                setSideClosed(false);
              }}
            >
              <I.Folder /> Library <small>6</small>
            </button>
            <button
              type="button"
              className={surface === "page" ? "selected" : ""}
              onClick={() => {
                if (saveOpen) leaveDetail();
                setSurface("page");
              }}
            >
              <Logo size={16} /> Assistant
            </button>
          </nav>
          <div className="sidebar-section">
            <small>FOLDERS</small>
            <button
              type="button"
              onClick={() => {
                setSurface("side");
                setSideClosed(false);
                switchScene("organize");
              }}
            >
              <I.Folder /> Interiors
            </button>
            <button
              type="button"
              onClick={() => {
                setSurface("side");
                setSideClosed(false);
                switchScene("compare");
              }}
            >
              <I.Folder /> Objects
            </button>
            {review === "applied" ? (
              <button
                type="button"
                onClick={() => {
                  setSurface("side");
                  setSideClosed(false);
                }}
              >
                <I.Folder /> Quiet interiors
              </button>
            ) : null}
          </div>
          <div className="sidebar-foot">
            <span className="avatar">R</span>
            <span>
              Local Library<small>On this Mac</small>
            </span>
          </div>
        </aside>
        {saveOpen ? (
          <SaveDetail
            save={saveOpen}
            back={backFromSave}
            attach={attach}
            applied={
              review === "applied" && selectedSaves.includes(saveOpen.id)
            }
            attached={attached.includes(saveOpen.id)}
          />
        ) : surface === "side" ? (
          <section className="library-backdrop" aria-label="Sample library">
            <header>
              <strong>Library</strong>
              <span>6 Saves</span>
              {sideClosed ? (
                <IconButton
                  label="Open assistant"
                  onClick={() => setSideClosed(false)}
                >
                  <I.Chat />
                </IconButton>
              ) : null}
            </header>
            <div className="library-description">
              A few things worth keeping.
            </div>
            <div className="library-grid">
              {saves.map((save) => (
                <SaveCard
                  key={save.id}
                  save={save}
                  {...actions}
                  attached={attached.includes(save.id)}
                />
              ))}
            </div>
            <small className="library-footnote">
              Sample library for the prototype
            </small>
          </section>
        ) : null}
        <section
          hidden={surface === "side" ? sideClosed : !!saveOpen}
          className={`assistant variant-${variant} ${!turns.length && !busy ? "empty-assistant" : ""}`}
          aria-label={
            surface === "side" ? "Assistant side panel" : "Assistant page"
          }
        >
          <header className="assistant-header">
            <div className="chat-switch">
              <button
                type="button"
                className="chat-title"
                onClick={() => setHistoryOpen(!historyOpen)}
                aria-expanded={historyOpen}
              >
                {turns.length || busy ? "Quiet interiors" : "New Chat"}
                <I.Down />
              </button>
              {historyOpen ? (
                <div className="history-menu">
                  <small>RECENT CHATS</small>
                  <button type="button" onClick={newChat}>
                    <I.Plus /> New Chat
                  </button>
                  {(["search", "compare", "organize"] as const).map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => switchScene(item)}
                    >
                      <I.Chat />
                      <span>
                        {item === "search"
                          ? "Quiet interiors"
                          : item === "compare"
                            ? "Comparing materials"
                            : "A place for these references"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="header-actions">
              <IconButton
                label="Chat history"
                onClick={() => setHistoryOpen(!historyOpen)}
              >
                <I.History />
              </IconButton>
              <IconButton label="New chat" onClick={newChat}>
                <I.Plus />
              </IconButton>
              <IconButton
                label={
                  surface === "side" ? "Expand assistant" : "Open side panel"
                }
                onClick={() => setSurface(surface === "side" ? "page" : "side")}
              >
                <I.Panel />
              </IconButton>
              {surface === "side" ? (
                <IconButton
                  label="Close side panel"
                  onClick={() => setSideClosed(true)}
                >
                  <I.Close />
                </IconButton>
              ) : null}
            </div>
          </header>
          {variant === "canvas" && surface === "side" && turns.length ? (
            <div
              className="canvas-tabs"
              role="tablist"
              aria-label="Assistant content"
            >
              <button
                type="button"
                role="tab"
                aria-selected={canvasTab === "answer"}
                onClick={() => setCanvasTab("answer")}
              >
                Conversation
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={canvasTab === "board"}
                onClick={() => setCanvasTab("board")}
              >
                References <span>6</span>
              </button>
            </div>
          ) : null}
          <div className="assistant-content">
            {variant === "canvas" &&
            surface === "side" &&
            canvasTab === "board" &&
            turns.length ? (
              board
            ) : (
              <div className="conversation-column">
                <div
                  className="thread"
                  ref={thread}
                  role="log"
                  aria-label="Conversation"
                >
                  <div className="thread-inner">
                    {turns.map((turn) => (
                      <div className="turn" key={turn.id}>
                        <div className="user-message">{turn.prompt}</div>
                        <div className="assistant-message">
                          <div className="response-identity">
                            <Logo size={17} />
                            <span>Assistant</span>
                          </div>
                          {turn.scene === "compare" ? (
                            <>
                              <Prose {...actions} content={comparison} />
                              <Palette />
                            </>
                          ) : turn.scene === "organize" ? (
                            <>
                              <Prose
                                {...actions}
                                content={
                                  "These references belong together. I'd put them in **Quiet interiors** and add a shared tag so they're easier to find later. Review the changes below."
                                }
                              />
                              <Review
                                state={review}
                                setState={setReview}
                                selected={selectedSaves}
                                setSelected={setSelectedSaves}
                                open={openSave}
                              />
                            </>
                          ) : turn.scene === "question" ? (
                            <>
                              <Prose
                                {...actions}
                                content={
                                  "There's a useful split in these references: softer light and tactile materials, or darker objects and stronger contrast."
                                }
                              />
                              <div className="question-pair">
                                {[saves[0], saves[2]].map((save) => (
                                  <SaveCard
                                    key={save.id}
                                    save={save}
                                    {...actions}
                                    attached={attached.includes(save.id)}
                                  />
                                ))}
                              </div>
                              <Question onContinue={insert} />
                            </>
                          ) : variant === "inline" ? (
                            <VariantInline {...actions} attached={attached} />
                          ) : variant === "editorial" ? (
                            <VariantEditorial
                              {...actions}
                              attached={attached}
                            />
                          ) : (
                            <VariantCanvas
                              {...actions}
                              onShowBoard={() => {
                                if (surface === "side") setCanvasTab("board");
                                else
                                  document
                                    .querySelector(".reference-board")
                                    ?.scrollIntoView({
                                      block: "nearest",
                                      behavior: "smooth",
                                    });
                              }}
                            />
                          )}
                          <div className="response-footer">
                            <Activity />
                            <div className="message-actions">
                              <IconButton
                                label="Copy answer"
                                onClick={(event) => {
                                  const answer = Array.from(
                                    event.currentTarget
                                      .closest(".assistant-message")
                                      ?.querySelectorAll(
                                        ".prose, .editorial-intro, .editorial-observation h3",
                                      ),
                                  )
                                    .map((node) => node.textContent)
                                    .join("\n\n");
                                  void navigator.clipboard
                                    .writeText(answer)
                                    .then(() => setNotice("Answer copied"));
                                }}
                              >
                                <I.Copy />
                              </IconButton>
                              <IconButton
                                label="Quote answer"
                                onClick={(event) => {
                                  setQuote(
                                    event.currentTarget
                                      .closest(".assistant-message")
                                      ?.querySelector(
                                        ".prose, .editorial-intro",
                                      )?.textContent ?? "This answer",
                                  );
                                  input.current?.focus();
                                }}
                              >
                                <I.Chat />
                              </IconButton>
                            </div>
                          </div>
                          {turn.scene === "search" ? (
                            <div className="followups">
                              <button
                                type="button"
                                onClick={() => insert(prompts.compare)}
                              >
                                Compare the References <I.ArrowRight />
                              </button>
                              <button
                                type="button"
                                onClick={() => insert(prompts.organize)}
                              >
                                Bring Them Together <I.Plus />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {busy ? (
                      <div className="turn">
                        <div className="user-message">{pendingPrompt}</div>
                        <div className="working" role="status">
                          <Logo size={17} />
                          <span>{busy}</span>
                          <span className="working-dots">···</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {composer}
              </div>
            )}
            {variant === "canvas" && surface === "page" && turns.length
              ? board
              : null}
          </div>
        </section>
      </div>
      {notice ? (
        <div className="toast" role="status">
          <I.Check />
          {notice}
        </div>
      ) : null}
      {inspect ? (
        <aside className="state-inspector">
          <header>
            Prototype State{" "}
            <IconButton
              label="Close state inspector"
              onClick={() => setInspect(false)}
            >
              <I.Close />
            </IconButton>
          </header>
          <pre>
            {JSON.stringify(
              {
                variant,
                surface,
                scene,
                sampleTurns: turns.length,
                draft,
                attachedSaveIds: attached,
                review,
                selectedSaveIds: selectedSaves,
                sideClosed,
                saveDetailId: saveOpen?.id ?? null,
                quotedContext: quote,
                busy: busy || false,
              },
              null,
              2,
            )}
          </pre>
          <p>
            All interactions are in memory. No model, IPC, or library writes.
          </p>
        </aside>
      ) : null}
      {import.meta.env.DEV ? (
        <div
          className="prototype-switcher"
          role="toolbar"
          aria-label="Prototype controls"
        >
          <IconButton
            label="Previous design"
            onClick={() =>
              setVariant(
                variants[
                  (variants.findIndex((item) => item.key === variant) + 2) % 3
                ].key,
              )
            }
          >
            <I.ArrowLeft />
          </IconButton>
          <div className="variant-label">
            <small>
              {variants.findIndex((item) => item.key === variant) + 1} / 3
            </small>
            <strong>
              {variants.find((item) => item.key === variant)?.name}
            </strong>
          </div>
          <IconButton
            label="Next design"
            onClick={() =>
              setVariant(
                variants[
                  (variants.findIndex((item) => item.key === variant) + 1) % 3
                ].key,
              )
            }
          >
            <I.ArrowRight />
          </IconButton>
          <span className="switcher-divider" />
          <button
            type="button"
            className={surface === "page" ? "active" : ""}
            onClick={() => {
              if (saveOpen) leaveDetail();
              setSurface("page");
            }}
          >
            Page
          </button>
          <button
            type="button"
            className={surface === "side" ? "active" : ""}
            onClick={() => {
              setSurface("side");
              setSideClosed(false);
            }}
          >
            Side Panel
          </button>
          <span className="switcher-divider" />
          <select
            aria-label="Prototype scenario"
            value={scene}
            onChange={(event) => switchScene(event.target.value as Scene)}
          >
            <option value="search">Search Results</option>
            <option value="compare">Comparison</option>
            <option value="organize">Review Changes</option>
            <option value="question">Inline Question</option>
            <option value="empty">New Chat</option>
          </select>
          <IconButton
            label="Inspect prototype state"
            onClick={() => setInspect(!inspect)}
          >
            <I.Gear />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}
