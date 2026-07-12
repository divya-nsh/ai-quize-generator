/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { generateQuizeServerFn } from '#/server/app.functions'

export const Route = createFileRoute('/old')({ component: Home })

async function GenerateQuize(
  topic: string,
  totalQuestions: number,
): Promise<Question[]> {
  const res = await generateQuizeServerFn({ data: { topic, totalQuestions } })
  return res
}

type Question = {
  question: string
  options: string[]
  answer: number
  explanation: string
  difficultyLevel: string
  userAnswer?: number
}

type Phase = 'setup' | 'quiz' | 'feedback' | 'results' | 'review'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ── Web Speech ────────────────────────────────────────────────────────────────
function useSpeech() {
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const speak = useCallback(
    (
      text: string,
      options?: {
        rate?: number
        pitch?: number
        onEnd?: () => void
      },
    ) => {
      if (!window.speechSynthesis) return

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      const words = text.split(' ')

      utterance.rate = options?.rate ?? 1
      utterance.pitch = options?.pitch ?? 1
      utterance.volume = 1

      const voices = window.speechSynthesis.getVoices()

      const preferred =
        voices.find((v) => v.lang.startsWith('en') && v.localService) ??
        voices.find((v) => v.lang.startsWith('en'))

      if (preferred) {
        utterance.voice = preferred
      }

      setIsSpeaking(true)

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex

          let count = 0

          for (let i = 0; i < words.length; i++) {
            count += words[i].length + 1

            if (charIndex < count) {
              setCurrentWordIndex(i)
              break
            }
          }
        }
      }

      utterance.onend = () => {
        setCurrentWordIndex(-1)
        setIsSpeaking(false)
        options?.onEnd?.()
      }

      utterRef.current = utterance

      window.speechSynthesis.speak(utterance)
    },
    [],
  )

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setCurrentWordIndex(-1)
    setIsSpeaking(false)
  }, [])

  return {
    speak,
    stop,
    currentWordIndex,
    isSpeaking,
  }
}

// ── Web Audio sounds ──────────────────────────────────────────────────────────
function useSound() {
  const ctx = useRef<AudioContext | null>(null)
  function getCtx() {
    if (!ctx.current) ctx.current = new AudioContext()
    return ctx.current
  }
  const correct = useCallback(() => {
    const ac = getCtx()
    const g = ac.createGain()
    g.connect(ac.destination)
    g.gain.setValueAtTime(0.18, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5)
    ;[523, 659, 784].forEach((freq, i) => {
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + i * 0.08)
      o.stop(ac.currentTime + i * 0.08 + 0.25)
    })
  }, [])
  const wrong = useCallback(() => {
    const ac = getCtx()
    const g = ac.createGain()
    g.connect(ac.destination)
    g.gain.setValueAtTime(0.15, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4)
    ;[300, 220].forEach((freq, i) => {
      const o = ac.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + i * 0.1)
      o.stop(ac.currentTime + i * 0.1 + 0.2)
    })
  }, [])
  const whoosh = useCallback(() => {
    const ac = getCtx()
    const g = ac.createGain()
    g.connect(ac.destination)
    g.gain.setValueAtTime(0.08, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3)
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(200, ac.currentTime)
    o.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.15)
    o.connect(g)
    o.start(ac.currentTime)
    o.stop(ac.currentTime + 0.3)
  }, [])
  const finish = useCallback(() => {
    const ac = getCtx()
    ;[523, 659, 784, 1046].forEach((freq, i) => {
      const g = ac.createGain()
      g.connect(ac.destination)
      g.gain.setValueAtTime(0.12, ac.currentTime + i * 0.12)
      g.gain.exponentialRampToValueAtTime(
        0.001,
        ac.currentTime + i * 0.12 + 0.4,
      )
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      o.connect(g)
      o.start(ac.currentTime + i * 0.12)
      o.stop(ac.currentTime + i * 0.12 + 0.4)
    })
  }, [])
  return { correct, wrong, whoosh, finish }
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function TypewriterText({
  text,
  onDone,
}: {
  text: string
  onDone?: () => void
}) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
        onDone?.()
      }
    }, 22)
    return () => clearInterval(interval)
  }, [text])

  return (
    <span>
      {displayed}
      {!done && (
        <span className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 align-middle animate-pulse" />
      )}
    </span>
  )
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    hue: [45, 200, 340, 120, 280][i % 5],
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    dur: 1 + Math.random() * 0.7,
    size: 6 + Math.random() * 7,
  }))
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            background: `hsl(${p.hue},90%,60%)`,
            animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  )
}

function DifficultyBadge({ level }: { level: Question['difficultyLevel'] }) {
  const cls = {
    easy: 'bg-green-500/10 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    hard: 'bg-red-500/10 text-red-400 border-red-500/30',
  }[level]
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-widest border rounded-full px-2.5 py-0.5 ${cls}`}
    >
      {level}
    </span>
  )
}

function QuestionDots({
  questions,
  currentIndex,
}: {
  questions: Question[]
  currentIndex: number
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => {
        let cls = 'bg-white/10'
        if (i < currentIndex)
          cls = q.userAnswer === q.answer ? 'bg-green-400' : 'bg-red-400'
        else if (i === currentIndex) cls = 'bg-amber-400 scale-125'
        return (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${cls}`}
          />
        )
      })}
    </div>
  )
}

// ── Staggered options list ─────────────────────────────────────────────────────
function OptionsList({
  options,
  phase,
  selectedOption,
  answer,
  onSelect,
}: {
  options: string[]
  phase: Phase
  selectedOption: number | null
  answer: number
  onSelect: (i: number) => void
}) {
  return (
    <motion.div className="flex flex-col gap-2.5">
      {options.map((opt, i) => {
        let cls =
          'border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5 cursor-pointer'
        let glow: React.CSSProperties = {}
        if (phase === 'feedback') {
          if (i === answer) {
            cls = 'border-green-500 bg-green-500/10 text-green-400'
            glow = { boxShadow: '0 0 12px rgba(74,222,128,0.25)' }
          } else if (i === selectedOption)
            cls = 'border-red-500 bg-red-500/10 text-red-400'
          else cls = 'border-white/5 text-gray-600'
        }
        return (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, delay: i * 0.1, ease: 'easeOut' }}
            onClick={() => onSelect(i)}
            disabled={phase === 'feedback'}
            style={glow}
            className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 disabled:cursor-default ${cls}`}
            whileHover={phase === 'quiz' ? { scale: 1.015 } : {}}
            whileTap={phase === 'quiz' ? { scale: 0.97 } : {}}
          >
            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1">{opt}</span>
            {phase === 'feedback' && i === answer && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                ✓
              </motion.span>
            )}
            {phase === 'feedback' && i === selectedOption && i !== answer && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                ✗
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </motion.div>
  )
}

function Home() {
  const [formData, setFormData] = useState({ topic: '', totalQuestions: 5 })
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<Phase>('setup')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [questionReady, setQuestionReady] = useState(false) // typewriter done → show options
  const [isSpeaking, setIsSpeaking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sound = useSound()
  const speech = useSpeech()

  useEffect(() => {
    if (phase === 'quiz' || phase === 'feedback') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  // speak + typewrite when question changes
  useEffect(() => {
    if (phase === 'quiz' && questions[currentIndex]) {
      setQuestionReady(false)
      const q = questions[currentIndex]
      setIsSpeaking(true)
      speech.speak(q.question)
      // poll speaking state
      const poll = setInterval(() => {
        if (!window.speechSynthesis?.speaking) {
          setIsSpeaking(false)
          clearInterval(poll)
        }
      }, 200)
      return () => clearInterval(poll)
    }
  }, [currentIndex, phase])

  async function handleGenerate() {
    if (!formData.topic.trim()) return setError('Please enter a topic.')
    setIsLoading(true)
    setError('')
    setElapsed(0)
    setStreak(0)
    try {
      const q = await GenerateQuize(formData.topic, formData.totalQuestions)
      setQuestions(q)
      setCurrentIndex(0)
      setSelectedOption(null)
      setQuestionReady(false)
      setPhase('quiz')
      sound.whoosh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  // function handleSelectOption(idx: number) {
  //   if (phase !== 'quiz') return
  //   const correct = idx === questions[currentIndex].answer
  //   setSelectedOption(idx)
  //   setQuestions((qs) =>
  //     qs.map((q, i) => (i === currentIndex ? { ...q, userAnswer: idx } : q)),
  //   )
  //   setPhase('feedback')
  //   speech.stop()
  //   if (correct) {
  //     sound.correct()
  //     const ns = streak + 1
  //     setStreak(ns)
  //     if (ns >= 3) setShowConfetti(true)
  //   } else {
  //     sound.wrong()
  //     setStreak(0)
  //   }
  // }

  function handleSelectOption(idx: number) {
    if (phase !== 'quiz') return

    const currentQuestion = questions[currentIndex]

    const correct = idx === currentQuestion.answer

    setSelectedOption(idx)

    setQuestions((qs) =>
      qs.map((q, i) => (i === currentIndex ? { ...q, userAnswer: idx } : q)),
    )

    setPhase('feedback')

    speech.stop()

    if (correct) {
      sound.correct()

      speech.speak(`Correct answer! ${currentQuestion.explanation}`, {
        rate: 1,
      })

      const ns = streak + 1
      setStreak(ns)

      if (ns >= 3) {
        setShowConfetti(true)
      }
    } else {
      sound.wrong()

      speech.speak(
        `Wrong answer. The correct answer is ${
          currentQuestion.options[currentQuestion.answer]
        }. ${currentQuestion.explanation}`,
        {
          rate: 1,
        },
      )

      setStreak(0)
    }
  }

  function handleNext() {
    sound.whoosh()
    setShowConfetti(false)
    speech.stop()
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1)
      setSelectedOption(null)
      setQuestionReady(false)
      setPhase('quiz')
    } else {
      sound.finish()
      setPhase('results')
    }
  }

  function handleRestart() {
    speech.stop()
    setPhase('setup')
    setQuestions([])
    setCurrentIndex(0)
    setSelectedOption(null)
    setElapsed(0)
    setStreak(0)
    setShowConfetti(false)
    setError('')
  }

  function handleReplayQuestion() {
    if (questions[currentIndex]) speech.speak(questions[currentIndex].question)
  }

  const score = questions.filter((q) => q.userAnswer === q.answer).length
  const current = questions[currentIndex]
  const reviewQ = questions[reviewIndex]

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-gray-900 rounded-3xl border border-white/10 p-10 py-8 shadow-2xl">
          <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1 mb-2">
            AI Powered
          </span>
          <h1 className="text-5xl font-black text-white tracking-tight leading-tight mb-2">
            Quiz
            <span className="text-amber-400 ml-4">Generator</span>
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Type a topic. We'll challenge you.
          </p>

          <div className="mb-6">
            <label className="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2">
              Topic
            </label>
            <textarea
              value={formData.topic}
              placeholder="e.g. React hooks, World War II, Black holes…"
              onChange={(e) =>
                setFormData((v) => ({ ...v, topic: e.target.value }))
              }
              rows={3}
              className="w-full bg-gray-950 border border-white/10 rounded-xl text-gray-200 text-sm placeholder-gray-600 px-4 py-3 resize-none outline-none focus:border-amber-400/40 transition-colors"
            />
          </div>

          <div className="mb-8">
            <label className="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-3">
              Questions —{' '}
              <span className="text-amber-400">{formData.totalQuestions}</span>
            </label>
            <input
              type="range"
              min={3}
              max={15}
              value={formData.totalQuestions}
              onChange={(e) =>
                setFormData((v) => ({ ...v, totalQuestions: +e.target.value }))
              }
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>3</span>
              <span>15</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <motion.button
            onClick={handleGenerate}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-gray-950 font-bold rounded-xl py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            )}
            {isLoading ? 'Generating…' : 'Generate Quiz →'}
          </motion.button>
        </div>
      </div>
    )
  }

  // ── QUIZ + FEEDBACK ────────────────────────────────────────────────────────
  if (phase === 'quiz' || phase === 'feedback') {
    const isCorrect = selectedOption === current.answer
    const progress = (currentIndex / questions.length) * 100

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        {showConfetti && <Confetti />}

        <div className="w-full max-w-4xl">
          {/* Top bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="h-1.5 bg-white/5 rounded-full mb-4 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center gap-3">
              <QuestionDots questions={questions} currentIndex={currentIndex} />
              <span className="text-xs font-semibold text-gray-500 ml-auto">
                {currentIndex + 1} / {questions.length}
              </span>
              <DifficultyBadge level={current.difficultyLevel} />
              <AnimatePresence>
                {streak >= 2 && (
                  <motion.span
                    key={streak}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="text-xs font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-2.5 py-0.5"
                  >
                    🔥 {streak} streak
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* LEFT */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-900 rounded-2xl border border-white/10 p-6 shadow-2xl"
              >
                {/* Question box with typewriter */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 mb-5 min-h-[72px]">
                  <p className="text-gray-100 text-base font-semibold leading-relaxed">
                    <TypewriterText
                      text={current.question}
                      onDone={() => setQuestionReady(true)}
                    />
                  </p>
                </div>

                {/* Replay + speaking indicator */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={handleReplayQuestion}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.786L4.17 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.17l4.213-3.786a1 1 0 011 .862zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {isSpeaking ? (
                      <span className="flex items-center gap-1">
                        Speaking
                        <span className="flex gap-0.5">
                          {[0, 1, 2].map((j) => (
                            <motion.span
                              key={j}
                              className="block w-0.5 h-2.5 bg-amber-400 rounded-full"
                              animate={{ scaleY: [1, 2, 1] }}
                              transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: j * 0.15,
                              }}
                            />
                          ))}
                        </span>
                      </span>
                    ) : (
                      'Read aloud'
                    )}
                  </button>
                </div>

                {/* Options — only render after typewriter finishes */}
                <AnimatePresence>
                  {(questionReady || phase === 'feedback') && (
                    <OptionsList
                      options={current.options}
                      phase={phase}
                      selectedOption={selectedOption}
                      answer={current.answer}
                      onSelect={handleSelectOption}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* RIGHT */}
            <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 shadow-2xl min-h-[200px] flex flex-col">
              <AnimatePresence mode="wait">
                {phase === 'feedback' ? (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1"
                  >
                    <motion.p
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className={`font-bold text-lg mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {isCorrect
                        ? streak >= 3
                          ? `🔥 ${streak} in a row!`
                          : '🎉 Correct!'
                        : '❌ Not quite'}
                    </motion.p>
                    <p className="text-gray-400 text-sm leading-relaxed flex-1">
                      {current.explanation}
                    </p>
                    <motion.button
                      onClick={handleNext}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="mt-6 w-full bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold rounded-xl py-3 text-sm transition-colors"
                    >
                      {currentIndex + 1 < questions.length
                        ? 'Next Question →'
                        : 'See Results →'}
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <span className="text-3xl opacity-20">💡</span>
                    <p className="text-gray-600 text-sm">
                      {questionReady
                        ? 'Pick an answer to see feedback'
                        : 'Reading question…'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const pct = Math.round((score / questions.length) * 100)
    const grade =
      pct >= 80
        ? {
            label: 'Excellent!',
            ring: 'border-green-500/40',
            color: 'text-green-400',
          }
        : pct >= 60
          ? {
              label: 'Good Job!',
              ring: 'border-yellow-500/40',
              color: 'text-yellow-400',
            }
          : {
              label: 'Keep Practicing',
              ring: 'border-red-500/40',
              color: 'text-red-400',
            }

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        {pct === 100 && <Confetti />}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-10 shadow-2xl text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className={`w-36 h-36 rounded-full border-4 ${grade.ring} bg-black/30 flex flex-col items-center justify-center mx-auto mb-5`}
          >
            <span className={`text-4xl font-black ${grade.color}`}>{pct}%</span>
            <span className="text-xs text-gray-500 mt-1">
              {score}/{questions.length} correct
            </span>
          </motion.div>

          <h2 className={`text-2xl font-bold mb-1 ${grade.color}`}>
            {grade.label}
          </h2>
          <p className="text-gray-500 text-sm mb-7">{formData.topic}</p>

          <div className="grid grid-cols-3 gap-3 mb-7">
            {[
              { val: formatTime(elapsed), label: 'Time' },
              { val: questions.length, label: 'Questions' },
              { val: score, label: 'Correct' },
            ].map(({ val, label }, idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.07 }}
                className="bg-white/[0.03] border border-white/[0.07] rounded-xl py-3"
              >
                <p className="text-xl font-bold text-gray-100 tabular-nums">
                  {val}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mb-8">
            {questions.map((q, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.35 + i * 0.04, type: 'spring' }}
                title={`Q${i + 1}: ${q.userAnswer === q.answer ? 'Correct' : 'Wrong'}`}
                className={`w-2.5 h-2.5 rounded-full ${q.userAnswer === q.answer ? 'bg-green-400' : 'bg-red-400'}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setReviewIndex(0)
                setPhase('review')
              }}
              className="flex-1 border border-white/15 text-gray-400 hover:text-gray-200 hover:border-white/25 font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Review Answers
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRestart}
              className="flex-1 bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold rounded-xl py-3 text-sm transition-colors"
            >
              New Quiz
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── REVIEW ─────────────────────────────────────────────────────────────────
  if (phase === 'review') {
    const isCorrect = reviewQ.userAnswer === reviewQ.answer
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={reviewIndex}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-7">
              <button
                onClick={() => setPhase('results')}
                className="text-xs text-gray-500 hover:text-gray-300 border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors mr-auto"
              >
                ← Results
              </button>
              <span className="text-xs font-semibold text-gray-500">
                {reviewIndex + 1} / {questions.length}
              </span>
              <DifficultyBadge level={reviewQ.difficultyLevel} />
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4 mb-6">
              <p className="text-gray-100 text-lg font-semibold leading-relaxed">
                {reviewQ.question}
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-5">
              {reviewQ.options.map((opt, i) => {
                let cls = 'border-white/5 text-gray-600'
                if (i === reviewQ.answer)
                  cls = 'border-green-500 bg-green-500/10 text-green-400'
                else if (i === reviewQ.userAnswer && !isCorrect)
                  cls = 'border-red-500 bg-red-500/10 text-red-400'
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`flex items-center gap-4 border rounded-xl px-4 py-3.5 text-sm font-medium ${cls}`}
                  >
                    <span className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {i === reviewQ.answer && (
                      <span className="text-green-400">✓</span>
                    )}
                    {i === reviewQ.userAnswer && !isCorrect && (
                      <span className="text-red-400">✗</span>
                    )}
                  </motion.div>
                )
              })}
            </div>

            <div
              className={`border rounded-xl px-5 py-4 bg-black/20 mb-5 ${isCorrect ? 'border-green-500/40' : 'border-red-500/40'}`}
            >
              <p
                className={`font-bold text-sm mb-1.5 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}
              >
                {isCorrect ? '✓ You got this right' : '✗ You got this wrong'}
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                {reviewQ.explanation}
              </p>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setReviewIndex((i) => i - 1)}
                disabled={reviewIndex === 0}
                className="flex-1 border border-white/15 text-gray-400 font-semibold rounded-xl py-3 text-sm disabled:opacity-30 hover:enabled:border-white/25 hover:enabled:text-gray-200 transition-colors"
              >
                ← Prev
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setReviewIndex((i) => i + 1)}
                disabled={reviewIndex === questions.length - 1}
                className="flex-1 border border-white/15 text-gray-400 font-semibold rounded-xl py-3 text-sm disabled:opacity-30 hover:enabled:border-white/25 hover:enabled:text-gray-200 transition-colors"
              >
                Next →
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  return null
}
