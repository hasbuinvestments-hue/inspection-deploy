import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/common/AppErrorBoundary'
import { initializeGlobalErrorLogging } from './lib/logger'

initializeGlobalErrorLogging()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(registrationError => {
      console.error('SW registration failed: ', registrationError);
    });
  });
}
