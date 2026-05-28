import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = document.getElementById('root')
if (!root) {
  console.error('Root element not found!')
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  const loading = document.getElementById('loading')
  if (loading) loading.style.display = 'none'
}
