import React from 'react';
import { logError } from '../../lib/logger';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logError(error, {
      source: 'react.error_boundary',
      metadata: {
        componentStack: errorInfo?.componentStack || null,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f172a', color: '#f8fafc', padding: '2rem' }}>
          <div style={{ maxWidth: 520, textAlign: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '2rem' }}>
            <h1 style={{ marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: 800 }}>Application Error</h1>
            <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>
              Something went wrong. The error has been logged. Refresh the page and try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ marginTop: '1.25rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: '0.8rem 1.2rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
