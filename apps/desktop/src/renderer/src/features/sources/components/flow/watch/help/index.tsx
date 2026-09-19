import { Dialog } from "@pond/ui";
import { sourceFlow } from "@/features/sources/state/source-flow";
import styles from "./styles.module.css";

export function WatchHelpSection() {
  return (
    <>
      <div className={styles.body}>
        <p>
          Paste a link or enter a handle. Pond looks for matching accounts.
          Select an account to start collecting its new posts.
        </p>
        <h2>Checking on a schedule</h2>
        <p>
          Pond checks for new posts using your global schedule. Change it in
          Settings → Fetch Schedule.
        </p>
        <h2>Your privacy</h2>
        <p>
          Some sources check through your own connected session, and the account
          never knows. Nothing is posted, followed, or liked on your behalf.
        </p>
      </div>
      <Dialog.Footer className={styles.footer}>
        <Dialog.Confirm onClick={() => sourceFlow.back()}>
          Got It
        </Dialog.Confirm>
      </Dialog.Footer>
    </>
  );
}
