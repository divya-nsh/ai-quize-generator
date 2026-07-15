import { useState, useEffect, startTransition } from 'react'

function useSessionStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const storedValue = JSON.parse(
        sessionStorage.getItem(key) || 'null',
      ) as T | null
      if (storedValue) {
        startTransition(() => {
          setValue(storedValue)
        })
      }
    } catch (error) {
      console.error('Error reading sessionStorage key:', key, error)
    }
  }, [key])

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Error syncing sessionStorage key:', key, error)
    }
  }, [key, value])

  const removeValue = () => {
    try {
      sessionStorage.removeItem(key)
      setValue(initialValue)
    } catch (error) {
      console.error('Error removing sessionStorage key:', key, error)
    }
  }

  return [value, setValue, removeValue] as const
}

export default useSessionStorage
