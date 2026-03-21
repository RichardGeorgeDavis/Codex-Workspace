export type ThemePreset = 'preset-1' | 'preset-2'
export type ThemeMode = 'dark' | 'light'

export type ThemePreference = {
  mode: ThemeMode
  preset: ThemePreset
}

export type ThemePresetOption = {
  description: string
  id: ThemePreset
  label: string
  palette: string
}

const themePresetLookup = new Set<ThemePreset>(['preset-1', 'preset-2'])
const themeModeLookup = new Set<ThemeMode>(['dark', 'light'])

export const defaultThemePreference: ThemePreference = {
  mode: 'light',
  preset: 'preset-1',
}

export const themeStorageKey = 'workspace-hub.theme'

export const themePresets: ThemePresetOption[] = [
  {
    description: 'Preset 1 preserves the current warm workspace styling as the baseline.',
    id: 'preset-1',
    label: 'Preset 1 · Workspace Current',
    palette: 'Current workspace palette',
  },
  {
    description:
      'Preset 2 shifts the Hub into a sharper GitHub and DigitalOcean-style dashboard using Dracula Classic and Alucard Classic tokens.',
    id: 'preset-2',
    label: 'Preset 2 · Dracula Ops',
    palette: 'Dracula Classic / Alucard Classic',
  },
]

function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === 'string' && themePresetLookup.has(value as ThemePreset)
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && themeModeLookup.has(value as ThemeMode)
}

export function resolveThemePreference(value: unknown): ThemePreference {
  if (!value || typeof value !== 'object') {
    return defaultThemePreference
  }

  const candidate = value as Partial<ThemePreference>

  return {
    mode: isThemeMode(candidate.mode) ? candidate.mode : defaultThemePreference.mode,
    preset: isThemePreset(candidate.preset)
      ? candidate.preset
      : defaultThemePreference.preset,
  }
}

export function loadStoredThemePreference() {
  if (typeof window === 'undefined') {
    return defaultThemePreference
  }

  try {
    const storedValue = window.localStorage.getItem(themeStorageKey)

    if (!storedValue) {
      return defaultThemePreference
    }

    return resolveThemePreference(JSON.parse(storedValue))
  } catch {
    return defaultThemePreference
  }
}

export function persistThemePreference(preference: ThemePreference) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(themeStorageKey, JSON.stringify(preference))
  } catch {
    // Ignore storage failures and keep the in-memory theme active.
  }
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.dataset.themeMode = preference.mode
  root.dataset.themePreset = preference.preset
  root.style.colorScheme = preference.mode
}
