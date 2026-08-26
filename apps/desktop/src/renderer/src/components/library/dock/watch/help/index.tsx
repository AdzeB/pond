import { TrayCard } from "@pond/ui";
import { useDock } from "@/components/library/dock/lib/context";
import styles from "./styles.module.css";

export function WatchHelpSection() {
  const dock = useDock();

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back
          aria-label="Back to Sources"
          onClick={() => dock.openViewMenu("watch-source")}
        />
        <TrayCard.Title position="center">Watching an Account</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
      </TrayCard.Header>
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
      <TrayCard.Footer>
        <TrayCard.Confirm
          onClick={(e) => {
            e.preventDefault();
            dock.openViewMenu("watch-source");
          }}
        >
          Got It
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
