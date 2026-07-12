import { useState, useEffect } from 'react'

function useSessionStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.error('Error reading sessionStorage key:', key, error)
      return initialValue
    }
  })

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
