import { Dialog } from "@pond/ui";
import { sourceFlow } from "@/features/sources/state/source-flow";
import detailStyles from "../../detail/detail.module.css";
import styles from "./help.module.css";

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
          Pond checks for new saves using your global schedule. Change it in
          Settings → Fetch Schedule.
        </p>
        <h2>Your data</h2>
        <p>
          Your session stays on this device. Pond only reads your saves. It
          never posts, follows, or likes on your behalf.
        </p>
      </div>
      <Dialog.Footer className={detailStyles.footer}>
        <Dialog.Confirm onClick={() => sourceFlow.back()}>
          Got It
        </Dialog.Confirm>
      </Dialog.Footer>
    </>
  );
}
