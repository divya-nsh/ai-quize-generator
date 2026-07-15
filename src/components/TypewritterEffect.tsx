import { useEffect, useState, useEffectEvent } from 'react'

export function TypewriterText({
  text,
  onDone,
}: {
  text: string
  onDone?: () => void
}) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  const handleDoneEvent = useEffectEvent(() => {
    onDone?.()
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
        handleDoneEvent()
      }
    }, 22)
    return () => clearInterval(interval)
  }, [text])

  return (
    <>
      {displayed}
      {!done && (
        <span className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 align-middle animate-pulse" />
      )}
    </>
  )
}
