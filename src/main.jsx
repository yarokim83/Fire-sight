import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
