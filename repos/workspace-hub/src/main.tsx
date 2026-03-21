import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import {
  applyThemePreference,
  loadStoredThemePreference,
} from './features/theme/theme.ts'
import './styles/global.css'

const initialThemePreference = loadStoredThemePreference()
applyThemePreference(initialThemePreference)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initialThemePreference={initialThemePreference} />
  </StrictMode>,
)
