import { PageDialog } from "@pond/ui";
import { sourceFlow } from "@/stores/source-flow";
import styles from "./styles.module.css";

export function ConnectHelpSection() {
  return (
    <>
      <div className={styles.body}>
        <p>
          Connecting links an account you own to Pond. Pick a source and its
          sign-in page opens in your browser. Sign in as usual; the Pond
          extension sends your session automatically.
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
      <PageDialog.Footer>
        <PageDialog.Confirm onClick={() => sourceFlow.back()}>
          Got It
        </PageDialog.Confirm>
      </PageDialog.Footer>
    </>
  );
}
