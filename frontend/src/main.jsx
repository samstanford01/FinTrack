import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'
import { applyTheme } from './theme.js'
import { loadRewardsState } from './rewards.js'
import { applyTextSize, loadTextSize } from './settings.js'
import { applyColorBlindMode, loadColorBlindMode } from './accessibility.js'

// Apply selected theme early to avoid flash.
try {
  const { selectedThemeKey } = loadRewardsState()
  applyTheme(selectedThemeKey || "default")
} catch {
  applyTheme("default")
}

// Apply selected text size early to avoid flash.
try {
  applyTextSize(loadTextSize())
} catch {
  applyTextSize("md")
}

// Apply colour blind mode early to avoid flash.
try {
  applyColorBlindMode(loadColorBlindMode())
} catch {
  applyColorBlindMode(false)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
