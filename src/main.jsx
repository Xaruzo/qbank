import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import "katex/dist/katex.min.css";
import './styles/App.css'
import brandLogo from './models/Image/logo.png'

const faviconLink = document.querySelector("link[rel='icon']") || document.createElement("link")
faviconLink.rel = "icon"
faviconLink.type = "image/png"
faviconLink.href = brandLogo
if (!faviconLink.parentNode) document.head.appendChild(faviconLink)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
