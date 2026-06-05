import { useThemeMode } from '../hooks/useThemeMode'

/**
 * ☀ / ☾ segmented pill. Sits in the Header and on the Login screen.
 */
export default function ThemeToggle() {
  const { mode, setMode } = useThemeMode()
  return (
    <div className="theme-toggle" role="group" aria-label="מצב תצוגה">
      <button
        type="button"
        className={mode === 'dark' ? 'active' : ''}
        aria-pressed={mode === 'dark'}
        title="מצב כהה"
        onClick={() => setMode('dark')}
      >
        🌙
      </button>
      <button
        type="button"
        className={mode === 'light' ? 'active' : ''}
        aria-pressed={mode === 'light'}
        title="מצב בהיר"
        onClick={() => setMode('light')}
      >
        ☀
      </button>
    </div>
  )
}
