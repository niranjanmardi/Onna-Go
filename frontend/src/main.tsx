import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'

// Register PWA Service Worker with lifecycle handlers
export const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa:need-refresh', { detail: { updateSW } }));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('pwa:offline-ready'));
  },
});

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
    if (typeof (window as any).__onReactMounted === 'function') {
      (window as any).__onReactMounted();
    }
  } catch (err) {
    console.error('Fatal mount error:', err);
    container.innerHTML = `
      <div style="min-height: 100vh; background: #FAFAF8; color: #171717; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; font-family: 'Inter', system-ui, sans-serif; text-align: center;">
        <h2 style="font-size: 22px; color: #171717; font-weight: 700; margin-bottom: 8px;">ONNA-GO — Initializing Error</h2>
        <p style="color: #737373; font-size: 14px; max-width: 480px; margin-bottom: 20px;">Could not mount application. Please refresh or clear browser cache.</p>
        <pre style="background: #F4F4F2; padding: 12px; border-radius: 8px; font-size: 12px; color: #E11D48; max-width: 90vw; overflow: auto; border: 1px solid #E8E8E5;">${String(err)}</pre>
        <button onclick="localStorage.clear(); location.reload();" style="margin-top: 16px; padding: 10px 20px; background: #16834A; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px;">Clear Cache &amp; Reload</button>
      </div>
    `;
  }
} else {
  console.error('Fatal: #root element not found in DOM');
}
