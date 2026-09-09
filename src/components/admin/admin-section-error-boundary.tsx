"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  label?: string;
};

type State = {
  error: Error | null;
};

/** Keeps the rest of the admin editor mounted if a section throws. */
export class AdminSectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[admin-section]", this.props.label || "section", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-5">
          <p className="text-sm font-medium text-destructive">
            {this.props.label || "This section"} hit an error and was stopped so
            the rest of the page can stay usable.
          </p>
          <p className="mt-2 text-xs text-destructive/80">
            {this.state.error.message || "Unknown error"}
          </p>
          <button
            type="button"
            className="mt-4 rounded-2xl border border-destructive/40 bg-background/60 px-3 py-2 text-xs font-medium text-destructive"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
