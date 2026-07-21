/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type { TQuestions } from '#/server/app.server'
import { useState, useEffect, useRef } from 'react'
import { Card } from '../ui/card'
import { cn, formatTime } from '#/lib/utils'
import { Button } from '../ui/button'
import {
  ArrowRightIcon,
  MegaphoneIcon,
  RotateCcwIcon,
  SettingsIcon,
  LogOutIcon,
  LightbulbIcon,
  ScissorsIcon,
} from 'lucide-react'
import { Progress } from '../ui/progress'
import { useSound } from '#/hooks/useSound'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card'
import confetti from 'canvas-confetti'
import useTimeout from '#/hooks/useTimeout'
import { motion } from 'motion/react'
import { TypewriterText } from '../TypewritterEffect'
import { useSpeech } from '#/hooks/useWebSpeach'
import { useSettings } from '#/context/settings'
import { useTheme } from '#/components/theme-provider'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { generateHintServerFn } from '#/server/app.functions'
import useEventListener from '#/hooks/useEventListner'

const abc = ['A', 'B', 'C', 'D']

type QuizeState = Array<
  TQuestions[0] & {
    userAnswer?: number
    isCorrect?: boolean
    isAnswered?: boolean
  }
>

export default function QuizGame({
  questions,
  onNewQuiz,
}: {
  questions: TQuestions
  onNewQuiz: () => void
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [quize, setQuize] = useState<QuizeState>(questions)
  const [streak, setStreak] = useState(0)
  const [hint, setHint] = useState<{
    left: number
    text: string | null
    loading: boolean
    success: boolean
  }>({
    left: Math.round(questions.length * 0.3),
    text: null,
    loading: false,
    success: false,
  })
  const [fiftyFifty, setFiftyFifty] = useState<{
    left: number
    eliminated: number[]
  }>({ left: Math.round(questions.length * 0.15), eliminated: [] })
  const hintControllerRef = useRef<AbortController | null>(null)
  const sounds = useSound()
  const [startedAt] = useState(() => Date.now())
  const [showOptions, setShowOptions] = useState(false)
  const speech = useSpeech()
  const isQuizeReadRef = useRef(false)
  const { autoSpeech, autoNext } = useSettings()

  const question = quize[currentQuestionIndex]
  const isQuizDone = currentQuestionIndex === quize.length

  const handleSelectOption = (selectedOptionIndex: number) => {
    if (!question || question.isAnswered) return
    if (fiftyFifty.eliminated.includes(selectedOptionIndex)) return
    const isCorrect = selectedOptionIndex === question.answer
    const updatedQuize = [...quize]
    updatedQuize[currentQuestionIndex] = {
      ...updatedQuize[currentQuestionIndex]!,
      userAnswer: selectedOptionIndex,
      isCorrect,
      isAnswered: true,
    }
    setQuize(updatedQuize)
    if (isCorrect) {
      setStreak((s) => s + 1)
      sounds.correct()
      if (autoSpeech && !autoNext) {
        speech.speak('Correct Answer. ' + question.explanation)
      }
    } else {
      setStreak(0)
      if (autoSpeech) speech.speak('Incorrect.' + question.explanation)
      sounds.wrong()
    }
  }

  const resetHint = () => {
    setHint((h) => ({ ...h, text: null, success: false, loading: false }))
  }

  const nextQuestion = () => {
    if (hintControllerRef.current) hintControllerRef.current.abort()
    speech.stop()
    setCurrentQuestionIndex(currentQuestionIndex + 1)
    isQuizeReadRef.current = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (currentQuestionIndex === quize.length - 1) {
      const scorePct = Math.round(
        (quize.filter((q) => q.isCorrect).length / quize.length) * 100,
      )
      if (scorePct >= 90) {
        sounds.win()
      } else {
        sounds.finish()
      }

      if (scorePct >= 80) {
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
          })
        }, 100)
      }
    } else {
      const nextQuestionn = quize[currentQuestionIndex + 1]
      if (!nextQuestionn) return
      setShowOptions(false)
      sounds.whoosh()
      resetHint()
      setFiftyFifty((f) => ({ ...f, eliminated: [] }))
      document.getElementById('question-label')?.focus()
    }
  }

  useTimeout(
    () => {
      nextQuestion()
    },
    isQuizDone
      ? null
      : question?.isAnswered
        ? question?.isCorrect && autoNext
          ? 500
          : null
        : null,
  )

  const handleFiftyFifty = () => {
    if (fiftyFifty.left === 0 || !question || question.isAnswered) return
    // if (
    //   !confirm(
    //     'Use 50/50 lifeline? This will remove 2 wrong options. You only have 1 use.',
    //   )
    // )
    //   return
    const wrongIndices = ([0, 1, 2, 3] as number[]).filter(
      (i) => i !== question.answer,
    )
    // shuffle wrong options and pick 2 to eliminate
    const shuffled = wrongIndices.sort(() => Math.random() - 0.5)
    const toEliminate = shuffled.slice(0, 2)
    setFiftyFifty((p) => ({ left: p.left - 1, eliminated: toEliminate }))
    sounds.fiftyFifty()
  }

  const handleHintClick = async () => {
    if (!question || hint.left === 0 || hint.loading) return
    // if (
    //   !confirm(
    //     `Use AI Hint lifeline? You have ${hint.left} use${hint.left === 1 ? '' : 's'} remaining.`,
    //   )
    // )
    //   return
    if (hintControllerRef.current) hintControllerRef.current.abort()
    sounds.whoosh()
    const controller = new AbortController()
    hintControllerRef.current = controller
    setHint((h) => ({ ...h, loading: true }))
    try {
      const result = await generateHintServerFn({
        data: { question: question.question, options: question.options },
        signal: controller.signal,
      })
      setHint((h) => ({
        left: h.left - 1,
        text: result,
        loading: false,
        success: true,
      }))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.log('Request was aborted')
        return
      }
      setHint((h) => ({
        ...h,
        text: 'Error: Could not load hint. Please try again.',
        loading: false,
        success: false,
        signal: controller.signal,
      }))
    }
  }

  useEventListener('keydown', (e) => {
    if (isQuizDone) return
    const keyMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 }
    const index = keyMap[e.key.toLowerCase()]
    if (index !== undefined) {
      handleSelectOption(index)
    }
  })

  useEffect(() => {
    if (!question || !autoSpeech || isQuizeReadRef.current) return
    speech.speak(`${question.question}. ${question.options.join(', ')}`)
    isQuizeReadRef.current = true
  }, [question, speech, autoSpeech])

  if (isQuizDone || !question) {
    return (
      <SummaryScore quize={quize} onNewQuiz={onNewQuiz} startedAt={startedAt} />
    )
  }

  return (
    <div className="min-h-screen flex items-center py-6 px-4 animate-in">
      <div className=" max-w-4xl mx-auto w-full">
        <Progress
          className=""
          value={
            currentQuestionIndex === 0
              ? 1
              : ((currentQuestionIndex + 1) / questions.length) * 100
          }
        />
        <div className="flex flex-col gap-2 md:flex-row md:justify-between md:gap-4 md:items-center mt-2 mb-3">
          <QuestionDots questions={quize} currentIndex={currentQuestionIndex} />
          <div className="flex items-center gap-3 justify-between md:justify-end">
            {streak >= 3 && (
              <motion.div
                key={streak}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5 select-none"
              >
                🔥 {streak}x
              </motion.div>
            )}
            <div className="text-sm text-muted-foreground truncate">
              {currentQuestionIndex + 1} / {questions.length}
            </div>

            <QuizSettingsPopover />
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to quit the quiz?')) {
                  onNewQuiz()
                }
              }}
              className="p-1.5 text-sm items-center rounded-md gap-2 flex hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              aria-label="Quit quiz"
              title="Quit quiz"
            >
              Quit
              <LogOutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          key={currentQuestionIndex}
          className="gap-4 grid w-full grid-cols-1 md:grid-cols-[1.3fr_1fr]"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { duration: 0.25 } }}
            className="w-full"
          >
            <Card className="p-6 gap-2 w-full">
              <div className="mt-2" key={currentQuestionIndex}>
                <h2
                  id="question-label"
                  className="text-lg font-semibold"
                  tabIndex={-1}
                >
                  <TypewriterText
                    text={question.question}
                    onDone={() => {
                      setShowOptions(true)
                    }}
                  />
                </h2>
                <button
                  type="button"
                  className="text-sm flex items-center gap-1 text-muted-foreground mt-1 hover:text-primary transition-colors"
                  onClick={() => {
                    if (!speech.speaking) {
                      speech.speak(question.question)
                    } else {
                      speech.stop()
                    }
                  }}
                >
                  {speech.speaking ? (
                    <>
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
                      Speaking
                    </>
                  ) : (
                    <>
                      <MegaphoneIcon className="inline-block w-4 h-4 mr-1" />
                      Read aloud
                    </>
                  )}
                </button>
              </div>
              <motion.div
                className="mt-2 grid gap-2"
                initial="hidden"
                animate={showOptions ? 'visible' : 'hidden'}
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.2,
                      delayChildren: Math.min(0.5, questions.length * 0.025),
                    },
                  },
                }}
              >
                {question.options.map((option, index) => (
                  <motion.button
                    variants={{
                      hidden: { x: -50, opacity: 0 },
                      visible: {
                        x: 0,
                        opacity: fiftyFifty.eliminated.includes(index) ? 0 : 1,
                        transition: { duration: 0.2 },
                      },
                    }}
                    key={index}
                    type="button"
                    disabled={
                      question.isAnswered ||
                      fiftyFifty.eliminated.includes(index)
                    }
                    onClick={() => handleSelectOption(index)}
                    className={cn(
                      'border flex font-medium gap-2 items-center text-start cursor-pointer hover:bg-accent dark:hover:bg-gray-950/80 hover:scale-101 active:scale-95 transition-[transform,background-color,border-color,color,opacity] duration-150 py-3 px-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      question.isAnswered &&
                        'text-muted-foreground cursor-default',
                      question.isAnswered &&
                        index === question.answer &&
                        'border-green-500 text-foreground bg-green-500/10 animate-in',
                      question.isAnswered &&
                        !question.isCorrect &&
                        index === question.userAnswer &&
                        'border-destructive text-foreground bg-destructive/10 animate-shake',
                      fiftyFifty.eliminated.includes(index) &&
                        'cursor-not-allowed pointer-events-none',
                    )}
                  >
                    <span className=" bg-neutral-200/90 dark:bg-gray-800 size-5 flex items-center justify-center text-xs rounded-full">
                      {abc[index]}
                    </span>{' '}
                    {option}
                    <span>
                      {question.isAnswered && (
                        <>
                          {index === question.answer ? (
                            <span className="text-green-500 animate-in text-sm ml-2">
                              ✔
                            </span>
                          ) : index === question.userAnswer ? (
                            <span className="text-destructive animate-in text-sm ml-2">
                              ✖
                            </span>
                          ) : null}
                        </>
                      )}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { duration: 0.25, delay: 0.2 },
            }}
            className="w-full"
          >
            <Card className="p-6 h-max w-full">
              {!question.isAnswered && (
                <div className="text-muted-foreground flex flex-col gap-3">
                  <div className="flex flex-col items-center gap-2 py-4">
                    <span className="text-3xl opacity-50 dark:opacity-40">
                      💡
                    </span>
                    <span className="text-sm text-center">
                      Choose an option to see the answer and explanation.
                    </span>
                  </div>

                  {/* Lifelines */}
                  <div className="border-t border-border/40 pt-3">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
                      Lifelines
                    </p>

                    <button
                      type="button"
                      disabled={hint.left === 0 || hint.loading}
                      onClick={handleHintClick}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                        hint.left > 0
                          ? 'border-amber-400/60 dark:border-amber-400/40 dark:text-amber-400/70 bg-amber-400/5 text-amber-400 hover:bg-amber-400/30'
                          : 'border-border/30 line-through text-muted-foreground/40 cursor-not-allowed',
                      )}
                    >
                      <LightbulbIcon className="w-4 h-4 shrink-0" />
                      {hint.loading ? 'Getting hint…' : `AI Hint`}
                      <span className="ml-auto text-xs">{hint.left} left</span>
                    </button>
                    {hint.text && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg mt-2 border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 text-sm text-amber-400 font-medium dark:text-amber-300"
                      >
                        Hint: {hint.text}
                      </motion.div>
                    )}
                    <button
                      type="button"
                      disabled={fiftyFifty.left === 0}
                      onClick={handleFiftyFifty}
                      className={cn(
                        'flex w-full mt-3 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                        fiftyFifty.left > 0
                          ? 'border-sky-400/40 bg-sky-400/6 text-sky-400 hover:bg-sky-400/15 dark:border-sky-400/30 dark:text-sky-400/80'
                          : 'border-border/30 line-through text-muted-foreground/40 cursor-not-allowed',
                      )}
                    >
                      <ScissorsIcon className="w-4 h-4 shrink-0" />
                      50 / 50
                      <span className="ml-auto text-xs">
                        {fiftyFifty.left} left
                      </span>
                    </button>
                  </div>
                </div>
              )}
              {question.isAnswered && (
                <>
                  <div className="">
                    <p className="text-lg">
                      {question.isCorrect ? (
                        <span className="text-green-600 dark:text-green-500 font-semibold flex items-center gap-2">
                          {'✔ '} Correct!
                        </span>
                      ) : (
                        <span className="text-destructive/90 font-semibold flex items-center gap-2">
                          {'✖ '} Incorrect!
                        </span>
                      )}
                    </p>
                    <p className=" text-muted-foreground mt-2">
                      {question.explanation}
                    </p>
                  </div>

                  <Button
                    onClick={nextQuestion}
                    autoFocus
                    className="w-full mt-3 px-6 py-5"
                  >
                    {currentQuestionIndex === quize.length - 1
                      ? 'Finish Quiz'
                      : 'Next Question'}{' '}
                    <ArrowRightIcon />
                  </Button>
                </>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function QuizSettingsPopover() {
  const { autoSpeech, autoNext, setAutoSpeech, setAutoNext } = useSettings()
  const { theme, toggleTheme } = useTheme()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quiz settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-3 py-4">
        <p className="text-sm font-semibold px-3">Settings</p>
        <div className="flex items-center px-3 justify-between">
          <Label
            htmlFor="qs-auto-speech"
            className="text-sm text-muted-foreground"
          >
            Auto speech
          </Label>
          <Switch
            id="qs-auto-speech"
            checked={autoSpeech}
            onCheckedChange={setAutoSpeech}
          />
        </div>
        <div className="flex items-center px-3 justify-between">
          <Label
            htmlFor="qs-auto-next"
            className="text-sm text-muted-foreground"
          >
            Auto next
          </Label>
          <Switch
            id="qs-auto-next"
            checked={autoNext}
            onCheckedChange={setAutoNext}
          />
        </div>
        <div className="w-full flex-1 border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-full justify-between px-3"
          >
            {theme === 'dark' ? (
              <>
                Light Mode <SunIcon />
              </>
            ) : (
              <>
                Dark Mode <MoonIcon />
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function QuestionDots({
  questions,
  currentIndex,
}: {
  questions: QuizeState
  currentIndex: number
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => {
        let cls = 'bg-neutral-200 dark:bg-white/10'
        if (i < currentIndex)
          cls = q.userAnswer === q.answer ? 'bg-green-400' : 'bg-red-400'
        else if (i === currentIndex) cls = 'bg-primary scale-125'
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

function getScoreIcon(score: number) {
  if (score >= 90) return '🏆'
  if (score >= 75) return '🎉'
  if (score >= 50) return '👍'
  if (score >= 25) return '📚'
  return '💪'
}

function SummaryScore({
  quize,
  onNewQuiz,
  startedAt,
}: {
  quize: QuizeState
  onNewQuiz: () => void
  startedAt: number
}) {
  const correct = quize.filter((q) => q.isCorrect).length
  const total = quize.length
  const pct = Math.round((correct / total) * 100)
  const [now] = useState(() => Date.now())

  const timeTaken = formatTime(now - startedAt)

  const scoreFeed =
    pct === 100 ? 'Excellent Work' : pct >= 60 ? 'Nice Work' : 'Keep Practicing'

  const feedColor =
    pct === 100
      ? 'text-green-400 bg-green-500/10 border-green-500/30'
      : pct >= 60
        ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
        : pct >= 40
          ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
          : 'text-red-400 bg-red-500/10 border-red-500/30'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animate-in">
      <motion.div
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="max-w-lg w-full mx-auto"
      >
        <Card className="p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-2xl font-bold">
              {getScoreIcon(pct)} You Score {pct}%
            </h2>
            <span
              className={cn(
                'text-xs font-semibold px-3 py-1 rounded-full border',
                feedColor,
              )}
            >
              {scoreFeed}
            </span>
            <CircleScore pct={pct} correct={correct} total={total} />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              ⏱ {timeTaken}
            </p>
          </div>

          {/* Question dots */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              className="flex flex-wrap justify-center gap-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.06, delayChildren: 0.3 },
                },
              }}
            >
              {quize.map((q, i) => (
                <HoverCard key={i} openDelay={100}>
                  <HoverCardTrigger asChild>
                    <motion.div
                      variants={{
                        hidden: { scale: 0, opacity: 0 },
                        visible: {
                          scale: 1,
                          opacity: 1,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 18,
                          },
                        },
                      }}
                      className={cn(
                        'size-3 rounded-full cursor-default hover:scale-125',
                        q.isCorrect ? 'bg-green-400' : 'bg-red-400',
                      )}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <p className="text-xs font-semibold mb-2">
                      {q.isCorrect ? (
                        <span className="text-green-500">✔ Correct</span>
                      ) : (
                        <span className="text-red-500">✖ Incorrect</span>
                      )}
                    </p>
                    <p className="text-sm font-medium mb-3">{q.question}</p>
                    <div className="grid gap-1">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={cn(
                            'text-xs px-2 py-1.5 rounded flex gap-2 items-center',
                            oi === q.answer && 'bg-green-500/15 text-green-400',
                            !q.isCorrect &&
                              oi === q.userAnswer &&
                              oi !== q.answer &&
                              'bg-red-500/15 text-red-400',
                          )}
                        >
                          <span className="bg-muted size-4 flex items-center justify-center rounded-full text-[10px] shrink-0">
                            {abc[oi]}
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      {q.explanation}
                    </p>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </motion.div>
          </div>

          <Button onClick={onNewQuiz} autoFocus className="w-full py-5">
            <RotateCcwIcon /> New Quiz
          </Button>

          <p className="text-xs text-muted-foreground text-center -mt-4">
            Hover a dot to review each question
          </p>
        </Card>
      </motion.div>
    </div>
  )
}

function CircleScore({
  pct,
  correct,
  total,
}: {
  pct: number
  correct: number
  total: number
}) {
  const size = 140
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference - (pct / 100) * circumference
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const id = setTimeout(() => setOffset(targetOffset), 400)
    return () => clearTimeout(id)
  }, [targetOffset])

  const color =
    pct === 100
      ? '#4ade80'
      : pct >= 70
        ? '#facc15'
        : pct >= 40
          ? '#fb923c'
          : '#f87171'

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none">
          {correct}
          <span className="text-muted-foreground text-lg font-normal">
            /{total}
          </span>
        </span>
      </div>
    </div>
  )
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}
