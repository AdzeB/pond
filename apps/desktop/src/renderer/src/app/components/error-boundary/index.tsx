import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorScreen } from "@/app/components/error-screen";

interface Props {
  children: ReactNode;
}

interface State {
  error: unknown;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(cause: unknown): Partial<State> {
    return { error: cause };
  }

  componentDidCatch(cause: unknown, info: ErrorInfo): void {
    console.error("[pond] render error", cause, info.componentStack);
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
