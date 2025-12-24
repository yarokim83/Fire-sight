import { StrictMode, Component, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Lazy load App to ensure main.jsx executes even if App fails to import
const App = lazy(() => import('./App.jsx'));

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a1a', height: '100vh', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ff5555' }}>시스템 오류 발생</h1>
          <p style={{ color: '#aaaaaa', marginBottom: '20px' }}>아래 내용을 캡처해서 개발자에게 보내주세요.</p>
          <div style={{ padding: '15px', backgroundColor: '#000', borderRadius: '5px', overflow: 'auto' }}>
            <h3 style={{ color: '#ffaaaa', marginTop: 0 }}>{this.state.error && this.state.error.toString()}</h3>
            <pre style={{ fontSize: '12px', color: '#888' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add a simple loading spinner for Suspense
const LoadingScreen = () => (
  <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#94a3b8' }}>
    Loading System...
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
