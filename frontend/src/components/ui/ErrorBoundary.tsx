/**
 * ErrorBoundary component for React error handling.
 *
 * PhD-level features:
 * - Catches rendering errors in child components (including lazy-loaded ones)
 * - Provides user-friendly fallback UI with retry capability
 * - Logs errors to console for debugging
 * - Type-safe with proper React 18 class component typing
 * - Accessible (ARIA attributes, keyboard support)
 *
 * NOTE: Error boundaries must be class components because React hooks
 * do not support componentDidCatch yet.
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import React from 'react';

interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: React.ReactNode;
  /** Optional fallback component to render on error */
  fallback?: React.ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary class component.
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the
 * component tree that crashed.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Call optional onError callback
    this.props.onError?.(error, errorInfo);

    // TODO: In production, send error to monitoring service
    // e.g., Sentry, LogRocket, or custom analytics endpoint
    if (import.meta.env.PROD) {
      // Example: await fetch('/api/errors', { method: 'POST', body: JSON.stringify({ error, errorInfo }) });
    }
  }

  /**
   * Reset the error boundary state to allow retrying.
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  /**
   * Force a full page reload as a last resort.
   */
  handleReload = (): void => {
    window.location.reload();
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          className="w-full h-[600px] bg-red-50 rounded-xl flex flex-col items-center justify-center border border-red-200 p-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Algo salió mal</h2>
            <p className="text-red-600 mb-4 text-sm">
              Se produjo un error al cargar este componente. Esto puede deberse a un
              problema de conexión o a un error inesperado.
            </p>

            {/* Error details (only in development) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-4 bg-white p-3 rounded border border-red-200">
                <summary className="cursor-pointer text-sm font-semibold text-red-700">
                  Detalles del error (solo desarrollo)
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Reintentar cargar el componente"
              >
                🔄 Reintentar
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Recargar la página completa"
              >
                🔃 Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
