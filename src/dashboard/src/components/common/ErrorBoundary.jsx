import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
          <div className="max-w-2xl w-full bg-bg-surface border border-error rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-error" />
              <h1 className="text-2xl font-bold text-text-primary">Something went wrong</h1>
            </div>
            <p className="text-text-secondary mb-4">
              An error occurred while rendering the dashboard. Please check the console for more details.
            </p>
            {this.state.error && (
              <div className="bg-bg-primary border border-border rounded-md p-4 mb-4">
                <p className="text-error font-code text-sm mb-2">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-text-muted text-xs overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-success hover:bg-success-hover text-bg-primary rounded-md font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
