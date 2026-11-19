import React from 'react';

interface ErrorBoundaryProps {
  /** Render the stand-in UI; the callback clears the error so children remount. */
  fallback: (reset: () => void) => React.ReactNode;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/effect failures from the 3D stage.
 *
 * React unmounts the whole tree when a component throws during render or inside
 * an effect, which is exactly how a missing WebGL context used to turn into a
 * blank page. Wrapping the stage keeps the shell (header, dock, modals) alive.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[stage] render error', error, info.componentStack);
    this.props.onError?.(error);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <>{this.props.fallback(this.reset)}</>;
    }
    return <>{this.props.children}</>;
  }
}
