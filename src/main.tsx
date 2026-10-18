import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { I18nProvider, useTranslation } from './utils/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorFallbackProps {
  error: Error | null;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error }) => {
  const { t } = useTranslation();
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080c14',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: '#0f172a',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f87171', marginBottom: '8px' }}>
          {t('errorBoundary.title')}
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '16px' }}>
          {t('errorBoundary.subtitle')}
        </p>
        {error?.message && (
          <pre style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fca5a5',
            overflowX: 'auto',
            fontFamily: 'monospace',
            marginBottom: '16px'
          }}>
            {error.message}
          </pre>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {t('errorBoundary.reload')}
          </button>
          <button
            onClick={() => {
              try {
                localStorage.clear();
              } catch {}
              window.location.reload();
            }}
            style={{
              backgroundColor: 'transparent',
              color: '#94a3b8',
              border: '1px solid #334155',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {t('errorBoundary.clearAndReload')}
          </button>
        </div>
      </div>
    </div>
  );
};

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[gripm Fatal Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <I18nProvider>
          <App />
        </I18nProvider>
      </RootErrorBoundary>
    </React.StrictMode>
  );
}

