import React, { useEffect } from 'react'

export default function useTimeout(
  callback: () => void,
  delay: number | null = null,
) {
  const savedCallback = React.useRef(callback)
  const timerId = React.useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return
    const id = setTimeout(() => savedCallback.current(), delay)
    timerId.current = id
    return () => clearTimeout(id)
  }, [delay])
}
