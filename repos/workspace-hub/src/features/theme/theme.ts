export type ThemePreset = 'preset-1' | 'preset-2' | 'preset-3' | 'preset-4' | 'preset-5'
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

const themePresetLookup = new Set<ThemePreset>([
  'preset-1',
  'preset-2',
  'preset-3',
  'preset-4',
  'preset-5',
])
const themeModeLookup = new Set<ThemeMode>(['dark', 'light'])

export const defaultThemePreference: ThemePreference = {
  mode: 'light',
  preset: 'preset-1',
}

export const themeStorageKey = 'workspace-hub.theme'

export const themePresets: ThemePresetOption[] = [
  {
    description:
      'Preset 1 shifts the Hub into a sharper GitHub and DigitalOcean-style dashboard using Dracula Classic and Alucard Classic tokens.',
    id: 'preset-2',
    label: 'Preset 1 · Ops',
    palette: 'Dracula Classic / Alucard Classic',
  },
  {
    description:
      'Preset 2 ports the local github-master Dracula Pro reference into the Hub with GitHub-style controls and denser spacing.',
    id: 'preset-3',
    label: 'Preset 2 · GitHub',
    palette: 'github-master Dracula Pro',
  },
  {
    description:
      'Preset 3 leans into the supplied Dracula Pro palette with a softer IDE-style surface stack and stronger purple-pink controls.',
    id: 'preset-4',
    label: 'Preset 3 · Studio',
    palette: 'Dracula Pro / Buffy / Alucard',
  },
  {
    description:
      'Preset 4 pushes a darker control-room dashboard using Dracula Pro, Van Helsing, and Alucard tokens with brighter component accents.',
    id: 'preset-5',
    label: 'Preset 4 · Control',
    palette: 'Dracula Pro / Van Helsing / Alucard',
  },
  {
    description: 'Preset 5 preserves the current warm workspace styling as the baseline.',
    id: 'preset-1',
    label: 'Preset 5 · Workspace',
    palette: 'Current workspace palette',
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
