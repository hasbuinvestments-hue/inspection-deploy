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
