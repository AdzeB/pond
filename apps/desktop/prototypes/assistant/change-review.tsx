import {
  IconCheckOutline18,
  IconTriangleWarningOutline18,
} from "@pond/icons/outline/18";
import { Button } from "@pond/ui/button";
import { changes, type Scenario } from "./fixtures";
import { SaveCover, sampleSave } from "./save-components";

export function ChangeReview({
  mode,
  selected,
  proposed,
  applied,
  failed,
  simulateFailure,
  onSimulateFailure,
  onSelect,
  onApply,
  onDismiss,
  onUndo,
  onReview,
  onOpen,
  onLibrary,
}: {
  mode: Scenario;
  selected: number[];
  proposed: number[];
  applied: number[];
  failed: number[];
  simulateFailure: boolean;
  onSimulateFailure: (value: boolean) => void;
  onSelect: (id: number) => void;
  onApply: () => void;
  onDismiss: () => void;
  onUndo: () => void;
  onReview: () => void;
  onOpen: (id: number) => void;
  onLibrary: (ids: number[]) => void;
}) {
  const reviewing = mode === "review";
  const applying = mode === "applying";
  const done = mode === "applied";
  const partial = mode === "partial-error";
  const restored = mode === "undone";
  const dismissed = mode === "dismissed";
  const shown =
    reviewing || dismissed
      ? changes.filter((change) => proposed.includes(change.id))
      : changes.filter((change) => selected.includes(change.id));
  const title = reviewing
    ? `Review ${proposed.length} suggested ${proposed.length === 1 ? "change" : "changes"}`
    : applying
      ? `Applying ${selected.length} ${selected.length === 1 ? "change" : "changes"}`
      : done
        ? `${applied.length} ${applied.length === 1 ? "change" : "changes"} applied`
        : partial
          ? `${applied.length} applied, ${failed.length} need attention`
          : restored
            ? "Changes undone"
            : "Changes dismissed";
  return (
    <section className="change-review" aria-label="Suggested changes">
      <header className="review-header">
        <span className="review-eyebrow">LIBRARY UPDATE</span>
        <h3 aria-live="polite">{title}</h3>
        <p>
          {reviewing
            ? "Choose what to change. Your Saves stay untouched until you apply."
            : applying
              ? "Updating the selected sample Saves."
              : restored
                ? "The original titles, tags, and folders are restored."
                : dismissed
                  ? "No changes were made to your Saves."
                  : partial
                    ? "Completed edits are kept. Retry only the unfinished changes."
                    : "The selected sample Saves are up to date."}
        </p>
        {reviewing ? (
          <label className="simulation-toggle">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(event) => onSimulateFailure(event.target.checked)}
            />
            Preview: fail the last selected edit
          </label>
        ) : null}
      </header>
      <div className="change-list">
        {shown.map((change) => {
          const appliedItem = applied.includes(change.id);
          const failedItem = failed.includes(change.id);
          return (
            <div
              className="change-item"
              key={change.id}
              data-muted={
                (reviewing && !selected.includes(change.id)) || undefined
              }
            >
              <div className="change-save">
                {reviewing ? (
                  <input
                    type="checkbox"
                    aria-label={`${change.label}: ${sampleSave(change.id, []).title}`}
                    checked={selected.includes(change.id)}
                    onChange={() => onSelect(change.id)}
                  />
                ) : null}
                <SaveCover id={change.id} />
                <button type="button" onClick={() => onOpen(change.id)}>
                  {sampleSave(change.id, applied).title}
                </button>
              </div>
              <div className="change-field">
                <span>{change.label}</span>
                {appliedItem ? (
                  <span className="change-status">
                    <IconCheckOutline18 /> Applied
                  </span>
                ) : failedItem ? (
                  <span className="change-status" data-failed>
                    <IconTriangleWarningOutline18 /> Not applied
                  </span>
                ) : applying ? (
                  <span className="change-status">Pending</span>
                ) : restored ? (
                  <span className="change-status">Restored</span>
                ) : null}
              </div>
              <div className="change-diff">
                <div>
                  <span className="diff-sign">−</span>
                  <span>{change.before}</span>
                </div>
                <div>
                  <span className="diff-sign">+</span>
                  <span>{change.after}</span>
                </div>
              </div>
              {failedItem ? (
                <p className="change-error">
                  This edit wasn't applied. Retry when you're ready.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <footer className="review-actions">
        {reviewing ? (
          <>
            <Button
              size="xs"
              variant="secondary"
              disabled={!selected.length}
              onClick={onApply}
            >
              Apply {selected.length}{" "}
              {selected.length === 1 ? "Change" : "Changes"}
            </Button>
            <Button size="xs" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          </>
        ) : null}
        {partial ? (
          <Button size="xs" variant="secondary" onClick={onApply}>
            Retry {failed.length} {failed.length === 1 ? "Change" : "Changes"}
          </Button>
        ) : null}
        {(done || partial) && applied.length > 0 ? (
          <Button size="xs" variant="ghost" onClick={onUndo}>
            Undo Changes
          </Button>
        ) : null}
        {done ? (
          <Button size="xs" variant="ghost" onClick={() => onLibrary(applied)}>
            Show in Library
          </Button>
        ) : null}
        {restored || dismissed ? (
          <Button size="xs" variant="ghost" onClick={onReview}>
            Review Again
          </Button>
        ) : null}
        {applying ? (
          <span role="status">
            {applied.length} of {selected.length} complete
          </span>
        ) : null}
      </footer>
    </section>
  );
}
