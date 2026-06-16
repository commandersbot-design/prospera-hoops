import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import ComingSoon from './ComingSoon.jsx'
import './index.css'

// Pre-launch gate. Defaults ON in production so the site cannot accidentally go
// public before launch; in local dev it's OFF so you see the real app.
// To go live on 06.18: set VITE_PRELAUNCH=false in Vercel (Production) → redeploy.
// To force the holding page anywhere: set VITE_PRELAUNCH=true.
const flag = import.meta.env.VITE_PRELAUNCH
const PRELAUNCH = flag === 'true' || (flag !== 'false' && import.meta.env.PROD)

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
          <App />
        </AuthProvider>
      </React.StrictMode>
    ),
  )
  const loading = document.getElementById('loading')
  if (loading) loading.style.display = 'none'
}
