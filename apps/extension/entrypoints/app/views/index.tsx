import { ConnectedView } from "./connected/index";
import { LoadingView } from "./loading/index";
import { OfflineView } from "./offline/index";
import { UnpairedView } from "./unpaired/index";

export type PopupViewProps =
  | { state: "loading" }
  | {
      state: "unpaired";
      value: string;
      onChange: (value: string) => void;
      onContinue: () => void | Promise<void>;
      busy: boolean;
      error: string | null;
      inputId?: string;
    }
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
    case "unpaired":
      return (
        <UnpairedView
          value={props.value}
          onChange={props.onChange}
          onContinue={props.onContinue}
          busy={props.busy}
          error={props.error}
          inputId={props.inputId}
        />
      );
    case "offline":
      return <OfflineView onRetry={props.onRetry} />;
    case "connected":
      return <ConnectedView libraryName={props.libraryName} />;
  }
}
