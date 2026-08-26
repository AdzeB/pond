import { ConnectedView } from "./connected/index";
import { LoadingView } from "./loading/index";
import { OfflineView } from "./offline/index";

export type PopupViewProps =
  | { state: "loading" }
  | {
      state: "offline";
      onRetry: () => void | Promise<void>;
    }
  | {
      state: "connected";
      libraryName: string;
    };

export function PopupView(props: PopupViewProps) {
  switch (props.state) {
    case "loading":
      return <LoadingView />;
    case "offline":
      return <OfflineView onRetry={props.onRetry} />;
    case "connected":
      return <ConnectedView libraryName={props.libraryName} />;
  }
}
