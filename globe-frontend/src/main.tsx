import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter} from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from "@vercel/speed-insights/react"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter >
    <Analytics/>
    <SpeedInsights/>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
