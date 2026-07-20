import { TrayCard } from "@pond/ui";
import { useDock } from "@/components/library-dock/lib/context";
import styles from "./help.module.css";

/** Drill-down from the connect picker explaining what connecting actually does. */
export function ConnectHelpSection() {
  const dock = useDock();

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back
          aria-label="Back to sources"
          onClick={() => dock.openViewMenu("connect-source")}
        />
        <TrayCard.Title position="center">Connecting a Source</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.body}>
        <p>
          Connecting links an account you own to Pond. Pick a source and its
          sign-in page opens in your browser. Sign in as usual, then push the
          session to Pond with the browser extension.
        </p>
        <h2>Staying in sync</h2>
        <p>
          Pond checks the account in the background on your chosen frequency and
          pulls new saves into your library as they land.
        </p>
        <h2>Your data</h2>
        <p>
          Your session stays on this device. Pond only reads your saves. It
          never posts, follows, or likes on your behalf.
        </p>
      </div>
      <TrayCard.Footer>
        <TrayCard.Confirm
          onClick={(e) => {
            e.preventDefault();
            dock.openViewMenu("connect-source");
          }}
        >
          Got It
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
