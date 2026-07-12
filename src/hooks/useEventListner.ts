import { useEffect, useRef } from 'react'

function useEventListener<TEventKey extends keyof WindowEventMap>(
  eventType: TEventKey,
  handler: (event: WindowEventMap[TEventKey]) => void,
  element: EventTarget = window,
) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const listener = (event: Event) => {
      handlerRef.current(event as WindowEventMap[TEventKey])
    }

    element.addEventListener(eventType, listener)

    return () => {
      element.removeEventListener(eventType, listener)
    }
  }, [eventType, element])
}

export default useEventListener
