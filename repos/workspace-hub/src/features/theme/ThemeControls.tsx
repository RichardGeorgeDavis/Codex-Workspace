import {
  themePresets,
  type ThemeMode,
  type ThemePreset,
} from './theme.ts'

type ThemeControlsProps = {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
  onPresetChange: (preset: ThemePreset) => void
  preset: ThemePreset
}

export function ThemeControls({
  mode,
  onModeChange,
  onPresetChange,
  preset,
}: ThemeControlsProps) {
  const activePreset =
    themePresets.find((presetOption) => presetOption.id === preset) ?? themePresets[0]

  return (
    <aside className="theme-console" aria-label="Appearance controls">
      <div className="theme-console-head">
        <div>
          <p className="eyebrow">Appearance</p>
          <h2>Style presets</h2>
        </div>
        <span className="theme-console-chip">
          {mode === 'light' ? 'Light mode' : 'Dark mode'}
        </span>
      </div>

      <label className="field compact">
        <span>Preset</span>
        <select
          onChange={(event) => {
            onPresetChange(event.target.value as ThemePreset)
          }}
          value={preset}
        >
          {themePresets.map((presetOption) => (
            <option key={presetOption.id} value={presetOption.id}>
              {presetOption.label}
            </option>
          ))}
        </select>
      </label>

      <div className="theme-mode-group" role="group" aria-label="Theme mode">
        <button
          className={`theme-mode-button ${mode === 'light' ? 'active' : ''}`}
          onClick={() => {
            onModeChange('light')
          }}
          type="button"
        >
          Light
        </button>
        <button
          className={`theme-mode-button ${mode === 'dark' ? 'active' : ''}`}
          onClick={() => {
            onModeChange('dark')
          }}
          type="button"
        >
          Dark
        </button>
      </div>

      <p className="theme-console-copy">{activePreset.description}</p>

      <div className="theme-console-meta">
        <span>{activePreset.palette}</span>
        <span>Saved locally in this browser</span>
      </div>
    </aside>
  )
}
