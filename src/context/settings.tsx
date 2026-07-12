import { createContext, useContext, useEffect, useState } from 'react'

type Settings = {
  autoSpeech: boolean
  autoNext: boolean
}

type SettingsContextType = Settings & {
  setAutoSpeech: (val: boolean) => void
  setAutoNext: (val: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | null>(null)

const STORAGE_KEY = 'quiz-settings'

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored)
      return { autoSpeech: true, autoNext: true, ...JSON.parse(stored) }
  } catch {
    // ignore
  }
  return { autoSpeech: true, autoNext: true }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore
    }
  }, [settings])

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setAutoSpeech: (val) => update({ autoSpeech: val }),
        setAutoNext: (val) => update({ autoNext: val }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
