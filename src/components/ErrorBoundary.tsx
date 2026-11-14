import React from 'react';

interface ErrorBoundaryProps {
  /** Dipanggil saat anak crash; `reset` mencoba merender anak lagi */
  fallback: (reset: () => void) => React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/** Menahan galat render di satu bagian halaman agar bagian lain tetap tampil */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  reset = () => this.setState({ failed: false });

  render() {
    return this.state.failed ? this.props.fallback(this.reset) : this.props.children;
  }
}
