import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import RebuildApp from './rebuild/RebuildApp.jsx'
import { AuthProvider } from './lib/auth.jsx'
import ComingSoon from './ComingSoon.jsx'
import './index.css'

// Pre-launch gate. The site is LAUNCHED and is PUBLIC by default. The holding
// page ONLY appears if VITE_PRELAUNCH is explicitly set to 'true' (any env).
// "Public" is the safe default so a missing/incorrect env var can never silently
// revert the live site to the holding page. To temporarily show the holding page
// again: set VITE_PRELAUNCH=true in Vercel → redeploy.
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

const PRELAUNCH = !bypass && flag === 'true'

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
