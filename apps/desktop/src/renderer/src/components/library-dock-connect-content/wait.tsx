import { IconArrowUpRightOutline18 as ArrowUpRight } from "@pond/icons/outline/18";
import { TrayCard } from "@pond/ui";
import { useDock } from "@/components/library-dock/lib/context";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";
import { useConnectWaiting } from "@/stores/connect-flow";
import styles from "./wait.module.css";

/** Sign-in wait card; the sources page polls for the account and closes the tray when it arrives. */
export function ConnectWaitSection() {
  const dock = useDock();
  const waiting = useConnectWaiting();
  /** Playground previews have no in-flight connect; any brand keeps the layout honest. */
  const source = waiting ?? "twitter";
  const label = getSourceDef(source).label;

  return (
    <>
      <TrayCard.Back onClick={() => dock.openViewMenu("connect-source")} />
      <TrayCard.Close />
      <div className={styles.hero}>
        <span className={styles.ring}>
          <BrandTile source={source} size={44} />
        </span>
        <TrayCard.Title>Sign in to {label}</TrayCard.Title>
        <TrayCard.Description>
          We opened {label} in your browser. Sign in as usual, then push the
          session with the Pond extension — this updates on its own.
        </TrayCard.Description>
      </div>
      <TrayCard.Footer>
        <TrayCard.Cancel />
        <TrayCard.Confirm
          onClick={(e) => {
            /** Reopening the browser keeps the wait alive; only the arriving account closes this card. */
            e.preventDefault();
            void window.pond.connectSource(source);
          }}
        >
          <ArrowUpRight width={14} height={14} />
          Reopen in Browser
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
