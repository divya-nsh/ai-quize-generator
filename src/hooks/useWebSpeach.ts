import { useCallback, useEffect, useState } from 'react'

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const updateState = () => {
      setSpeaking(speechSynthesis.speaking)
      setPaused(speechSynthesis.paused)
    }

    updateState()

    const interval = setInterval(updateState, 100)

    return () => clearInterval(interval)
  }, [])

  const speak = useCallback(
    (
      text: string,
      options?: {
        lang?: string
        rate?: number
        pitch?: number
        volume?: number
        voice?: SpeechSynthesisVoice
      },
    ) => {
      speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      utterance.lang = options?.lang ?? 'en-US'
      utterance.rate = options?.rate ?? 1
      utterance.pitch = options?.pitch ?? 1
      utterance.volume = options?.volume ?? 1

      if (options?.voice) {
        utterance.voice = options.voice
      }

      utterance.onstart = () => setSpeaking(true)

      utterance.onend = () => {
        setSpeaking(false)
        setPaused(false)
      }

      utterance.onerror = () => {
        setSpeaking(false)
        setPaused(false)
      }

      speechSynthesis.speak(utterance)
    },
    [],
  )

  const stop = useCallback(() => {
    speechSynthesis.cancel()
    setSpeaking(false)
    setPaused(false)
  }, [])

  const pause = useCallback(() => {
    speechSynthesis.pause()
    setPaused(true)
  }, [])

  const resume = useCallback(() => {
    speechSynthesis.resume()
    setPaused(false)
  }, [])

  useEffect(() => {
    return () => {
      speechSynthesis.cancel()
    }
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    speaking,
    paused,
  }
}

// export function useSpeech() {
//   const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

//   const [currentWordIndex, setCurrentWordIndex] = useState(-1)
//   const [isSpeaking, setIsSpeaking] = useState(false)

//   const speak = useCallback(
//     (
//       text: string,
//       options?: {
//         rate?: number
//         pitch?: number
//         onEnd?: () => void
//       },
//     ) => {
//       if (!window.speechSynthesis) return

//       window.speechSynthesis.cancel()

//       const utterance = new SpeechSynthesisUtterance(text)

//       const words = text.split(' ')

//       utterance.rate = options?.rate ?? 1
//       utterance.pitch = options?.pitch ?? 1
//       utterance.volume = 1

//       const voices = window.speechSynthesis.getVoices()

//       const preferred =
//         voices.find((v) => v.lang.startsWith('en') && v.localService) ??
//         voices.find((v) => v.lang.startsWith('en'))

//       if (preferred) {
//         utterance.voice = preferred
//       }

//       setIsSpeaking(true)

//       utterance.onboundary = (event) => {
//         if (event.name === 'word') {
//           const charIndex = event.charIndex

//           let count = 0

//           for (let i = 0; i < words.length; i++) {
//             count += words[i].length + 1

//             if (charIndex < count) {
//               setCurrentWordIndex(i)
//               break
//             }
//           }
//         }
//       }

//       utterance.onend = () => {
//         setCurrentWordIndex(-1)
//         setIsSpeaking(false)
//         options?.onEnd?.()
//       }

//       utterRef.current = utterance

//       window.speechSynthesis.speak(utterance)
//     },
//     [],
//   )

//   const stop = useCallback(() => {
//     window.speechSynthesis.cancel()
//     setCurrentWordIndex(-1)
//     setIsSpeaking(false)
//   }, [])

//   return {
//     speak,
//     stop,
//     currentWordIndex,
//     isSpeaking,
//   }
// }
