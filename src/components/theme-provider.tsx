import React, { useEffect } from 'react'

type ThemeContextType = {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

const context = React.createContext<ThemeContextType | undefined>(undefined)

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'

    const _theme = storedTheme || systemTheme
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(_theme)
    root.style.colorScheme = _theme
    return _theme
  })

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  useEffect(() => {
    localStorage.setItem('theme', theme)

    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.style.colorScheme = theme
  }, [theme])

  return (
    <context.Provider value={{ theme, toggleTheme }}>
      {children}
    </context.Provider>
  )
}

export function useTheme() {
  const ctx = React.useContext(context)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
