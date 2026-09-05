import { PageDialog } from "@pond/ui";
import { sourceFlow } from "@/features/sources/state/source-flow";
import styles from "./help.module.css";

export function WatchHelpSection() {
  return (
    <>
      <div className={styles.body}>
        <p>
          Watching follows a public account without signing in. Pick a source,
          enter a handle or link, and Pond collects their new posts as they
          land.
        </p>
        <h2>Checking on a schedule</h2>
        <p>
          Pond checks each watch in the background on your chosen frequency and
          adds anything new to your library.
        </p>
        <h2>Read-only</h2>
        <p>
          Some sources check through your own connected session, and the account
          never knows. Nothing is posted, followed, or liked on your behalf.
        </p>
      </div>
      <PageDialog.Footer>
        <PageDialog.Confirm onClick={() => sourceFlow.back()}>
          Got It
        </PageDialog.Confirm>
      </PageDialog.Footer>
    </>
  );
}
