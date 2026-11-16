import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './views/components/ErrorBoundary'
import { tryReloadForChunkError } from './utils/lazyWithRetry'
import './styles/App.css'

window.addEventListener("vite:preloadError", (event) => {
  if (tryReloadForChunkError()) {
    event.preventDefault();
  }
});

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
