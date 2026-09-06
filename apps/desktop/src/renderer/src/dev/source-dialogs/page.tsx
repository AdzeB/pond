import { Button } from "@pond/ui";
import { useRef, useState } from "react";
import { previewStep, steps } from "./catalog";
import styles from "./page.module.css";

function StepCard({ id }: { id: string }) {
  const step = previewStep(id);
  const entry = steps[step];
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState("waiting");
  const frame = useRef<HTMLIFrameElement>(null);
  const showState = (next: string) => {
    frame.current?.contentWindow?.postMessage(
      { type: "pond-preview-connection-state", state: next },
      window.location.origin,
    );
  };
  const url = `/source-dialogs.html?preview=${step}&state=${state}`;
  return (
    <section className={styles.card} id={step}>
      <header className={styles.cardHeader}>
        <div>
          <span className={styles.group}>{entry.group}</span>
          <h2>{entry.title}</h2>
        </div>
        <div className={styles.actions}>
          <a href={url} target="_blank" rel="noreferrer">
            Open
          </a>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setRevision((value) => value + 1)}
          >
            Reset
          </Button>
        </div>
      </header>
      <p className={styles.description}>{entry.description}</p>
      {step === "connect-wait" ? (
        <div className={styles.states}>
          {["waiting", "connected", "failed"].map((option) => (
            <Button
              key={option}
              size="xs"
              variant={state === option ? "secondary" : "ghost"}
              aria-pressed={state === option}
              onClick={() => {
                setState(option);
                showState(option);
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : null}
      <iframe
        ref={frame}
        key={revision}
        className={styles.frame}
        src={`/source-dialogs.html?preview=${step}&state=waiting`}
        onLoad={() => {
          if (step === "connect-wait") showState(state);
        }}
        title={entry.title}
        loading="lazy"
      />
    </section>
  );
}

export function SourceDialogsPage() {
  const [group, setGroup] = useState("All");
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.group}>Pond / Development</span>
          <h1>Source dialogs</h1>
          <p>
            Every step, using the real dialog components and isolated sample
            data.
          </p>
        </div>
        <a href="/components.html?component=Dialog">Component gallery</a>
      </header>
      <nav className={styles.filters} aria-label="Dialog groups">
        {["All", "Connect", "Watch", "Manage"].map((option) => (
          <Button
            key={option}
            variant={group === option ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={group === option}
            onClick={() => setGroup(option)}
          >
            {option}
          </Button>
        ))}
      </nav>
      <div className={styles.grid}>
        {Object.entries(steps)
          .filter(([, entry]) => group === "All" || entry.group === group)
          .map(([id]) => (
            <StepCard key={id} id={id} />
          ))}
      </div>
    </main>
  );
}
