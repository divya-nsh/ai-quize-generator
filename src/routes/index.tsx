/* eslint-disable no-shadow */
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Slider } from '#/components/ui/slider'
import { Textarea } from '#/components/ui/textarea'
import { Switch } from '#/components/ui/switch'
import { Label } from '#/components/ui/label'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { generateQuizeServerFn } from '#/server/app.functions'
import { cn } from '#/lib/utils'
import type { TQuestions } from '#/server/app.server'
import QuizGame from '#/components/quize/Queze'
import { useSettings } from '#/context/settings'
import useSessionStorage from '#/hooks/useSessionStorage'
import { Spinner } from '#/components/ui/spinner'
import { useTheme } from '#/components/theme-provider'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

const MAX_TOPIC_LENGTH = 500

function RouteComponent() {
  const [pending, setPending] = useState(false)
  const [quize, setQuize] = useSessionStorage<TQuestions | null>('quize', null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    topic: '',
    totalQuestions: 10,
  })
  const { autoSpeech, autoNext, setAutoSpeech, setAutoNext } = useSettings()
  const { theme, toggleTheme } = useTheme()

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (formData.topic.length > MAX_TOPIC_LENGTH) {
      setError(`Topic length exceeds ${MAX_TOPIC_LENGTH} characters.`)
      return
    }
    setError(null)
    setPending(true)
    try {
      const questions = await generateQuizeServerFn({ data: formData })
      setQuize(questions)
    } catch (error) {
      console.error('Error generating quiz:', error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setPending(false)
    }
  }

  if (quize) {
    return <QuizGame questions={quize} onNewQuiz={() => setQuize(null)} />
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="fixed top-4 right-4 z-50 rounded-full p-2 border border-border bg-background hover:bg-accent transition-colors"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      {/* subtle radial glow behind the card */}
      <div className="pointer-events-none bg-bac fixed inset-0 flex items-center justify-center">
        <div className="h-125 w-125 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <Card className="relative max-w-lg w-full shadow-xl border-border/60 [--card-spacing:--spacing(8)]">
        <CardHeader className="pb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 w-max">
            <span>✨</span> AI Powered
          </span>
          <CardTitle className="text-4xl lg:text-5xl font-black mt-2">
            Quiz
            <span className="text-primary ml-3">Generator</span>
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Challenge your knowledge on any topic with AI.
          </CardDescription>
        </CardHeader>

        <CardContent className="-mt-2">
          <form className="grid gap-7" onSubmit={handleSubmit}>
            {/* Topic */}
            <label className="space-y-1">
              <span className="text-sm pl-0.5 block font-semibold text-foreground">
                Topic
              </span>

              <Textarea
                required
                value={formData.topic}
                onChange={(e) =>
                  setFormData({ ...formData, topic: e.target.value })
                }
                placeholder="e.g. React hooks, World War II, Black holes…"
                maxLength={MAX_TOPIC_LENGTH}
                rows={3}
                className="resize-none"
              />
            </label>

            {/* Number of questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Number of questions
                </span>
                <span className="text-sm font-bold tabular-nums text-primary bg-primary/10 border border-primary/20 rounded-md px-2.5 py-0.5">
                  {formData.totalQuestions}
                </span>
              </div>

              <Slider
                value={[formData.totalQuestions]}
                onValueChange={(value) =>
                  setFormData({ ...formData, totalQuestions: value[0]! })
                }
                min={3}
                max={30}
                step={1}
              />

              <div className="flex justify-between text-xs text-muted-foreground select-none">
                <span>3</span>
                <span>30</span>
              </div>
            </div>

            {/* Settings */}
            <div className="grid gap-4">
              {/* <span className="text-sm font-semibold text-foreground">
                Options
              </span> */}
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="auto-speech"
                  className="text-sm text-muted-foreground"
                >
                  Auto speech
                  <span className="block text-xs text-muted-foreground/60">
                    Read questions &amp; answers aloud
                  </span>
                </Label>
                <Switch
                  id="auto-speech"
                  checked={autoSpeech}
                  onCheckedChange={setAutoSpeech}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="auto-next"
                  className="text-sm text-muted-foreground"
                >
                  Auto next
                  <span className="block text-xs text-muted-foreground/60">
                    Advance automatically on correct answer
                  </span>
                </Label>
                <Switch
                  id="auto-next"
                  checked={autoNext}
                  onCheckedChange={setAutoNext}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              className={cn(
                'mt-1 w-full py-5 text-sm font-semibold tracking-wide',
                pending && ' animate-pulse',
              )}
              disabled={formData.topic.trim().length === 0}
            >
              {pending ? (
                <>
                  <Spinner className="mr-2" /> Generating Quiz....
                </>
              ) : (
                '✨ Generate Quiz'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="absolute bottom-4 text-xs text-muted-foreground flex items-center gap-2">
        Created by{' '}
        <a
          href="https://divyanshsoni.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline text-muted-foreground hover:text-primary transition-colors"
        >
          Divyansh Soni
        </a>
        <span>·</span>
        <a
          href="https://github.com/divya-nsh/ai-quize-generator"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <GitIcon />
          Star on GitHub
        </a>
      </p>
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

function GitIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}
