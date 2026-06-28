import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorScreen } from "@/components/error-screen";

interface Props {
  children: ReactNode;
}

interface State {
  error: unknown;
  componentStack: string | null;
}

// Top-level safety net for render crashes outside the router's own boundary
// (effects bridges, portals, global dialogs). Renders ErrorScreen with the
// captured error + React component stack so the failure stays diagnosable.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("[pond] render error", error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private reset = (): void => {
    this.setState({ error: null, componentStack: null });
  };

  render(): ReactNode {
    if (this.state.error != null) {
      return (
        <ErrorScreen
          error={this.state.error}
          reset={this.reset}
          componentStack={this.state.componentStack}
        />
      );
    }
    return this.props.children;
  }
}
