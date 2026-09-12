"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onError?: () => void;
};

type State = {
  failed: boolean;
};

export class ClaimTagModelErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError?.();
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
