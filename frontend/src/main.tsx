import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const container = document.getElementById('root');
if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err) {
    console.error('Fatal mount error:', err);
    container.innerHTML = `
      <div style="min-height: 100vh; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; font-family: sans-serif; text-align: center;">
        <h2 style="font-size: 24px; color: #f97316; margin-bottom: 8px;">ONNA-GO — Initializing Error</h2>
        <p style="color: #94a3b8; max-width: 480px; margin-bottom: 20px;">Could not mount application. Please refresh or clear browser cache.</p>
        <pre style="background: #1e293b; padding: 12px; border-radius: 8px; font-size: 12px; color: #f43f5e; max-width: 90vw; overflow: auto;">${String(err)}</pre>
        <button onclick="localStorage.clear(); location.reload();" style="margin-top: 16px; padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Clear Cache &amp; Reload</button>
      </div>
    `;
  }
} else {
  console.error('Fatal: #root element not found in DOM');
}
