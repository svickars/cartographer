import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SitePasswordGate } from './components/SitePasswordGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SitePasswordGate>
      <App />
    </SitePasswordGate>
  </StrictMode>,
)
