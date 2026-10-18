import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { useApp } from './store/app'
import { startAutopilot } from './store/autopilot'

// Lets the test scripts drive and inspect the scenario (dev, or ?debug on a build).
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug'))
  (window as unknown as { __app: typeof useApp }).__app = useApp

startAutopilot(useApp)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
