import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import RebuildApp from './rebuild/RebuildApp.jsx'
import { AuthProvider } from './lib/auth.jsx'
import ComingSoon from './ComingSoon.jsx'
import './index.css'

// Pre-launch gate. Defaults ON in production so the site cannot accidentally go
// public before launch; in local dev it's OFF so you see the real app.
// To go live on 06.18: set VITE_PRELAUNCH=false in Vercel (Production) → redeploy.
// To force the holding page anywhere: set VITE_PRELAUNCH=true.
const flag = import.meta.env.VITE_PRELAUNCH

// Personal preview bypass: visit the live site once with ?preview=courtside to
// unlock the real app on THIS device (remembered via localStorage); the public
// keeps seeing the holding page. Add ?preview=off to re-lock this device.
const PREVIEW_KEY = 'courtside'
let bypass = false
try {
  const params = new URLSearchParams(window.location.search)
  const q = params.get('preview')
  if (q === 'off') localStorage.removeItem('ph_preview')
  else if (q === PREVIEW_KEY) localStorage.setItem('ph_preview', '1')
  bypass = localStorage.getItem('ph_preview') === '1'
} catch (e) { /* localStorage blocked — ignore, stay gated */ }

const PRELAUNCH = !bypass && (flag === 'true' || (flag !== 'false' && import.meta.env.PROD))

const root = document.getElementById('root')
if (!root) {
  console.error('Root element not found!')
} else {
  ReactDOM.createRoot(root).render(
    PRELAUNCH ? (
      <ComingSoon />
    ) : (
      <React.StrictMode>
        <AuthProvider>
          <RebuildApp />
        </AuthProvider>
      </React.StrictMode>
    ),
  )
  const loading = document.getElementById('loading')
  if (loading) loading.style.display = 'none'
}
