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

  const charsLeft = MAX_TOPIC_LENGTH - formData.topic.length

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* subtle radial glow behind the card */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-125 w-125 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <Card className="relative max-w-lg w-full shadow-xl border-border/60 [--card-spacing:--spacing(8)]">
        <CardHeader className="pb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 w-max">
            <span>✦</span> AI Powered
          </span>
          <CardTitle className="text-4xl lg:text-5xl font-black mt-2">
            Quiz
            <span className="text-primary ml-3">Generator</span>
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Challenge your knowledge on any topic.
          </CardDescription>
        </CardHeader>

        <CardContent className="-mt-2">
          <form className="grid gap-7" onSubmit={handleSubmit}>
            {/* Topic */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Topic
                </span>
                <span
                  className={`text-xs tabular-nums transition-colors ${
                    charsLeft <= 20
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {charsLeft} / {MAX_TOPIC_LENGTH}
                </span>
              </div>
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
            </div>

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
    </div>
  )
}

// const placeholderQuiz = [
//   {
//     question: 'Which country has the largest population?',
//     options: ['India', 'United States', 'Indonesia', 'Pakistan'],
//     answer: 0,
//     difficultyLevel: 'easy',
//     explanation:
//       'India surpasses all other countries with over 1.4 billion people.',
//   },
//   {
//     question: 'What is the capital city of Canada?',
//     options: ['Toronto', 'Ottawa', 'Vancouver', 'Montreal'],
//     answer: 1,
//     difficultyLevel: 'easy',
//     explanation: "Ottawa is Canada's federal capital, located in Ontario.",
//   },
//   {
//     question: 'Which of these countries is NOT a member of the European Union?',
//     options: ['Switzerland', 'Austria', 'Denmark', 'Slovakia'],
//     answer: 0,
//     difficultyLevel: 'medium',
//     explanation:
//       'Switzerland is not an EU member, though it has many bilateral agreements.',
//   },
//   // {
//   //   question: 'Mount Everest is located in which mountain range?',
//   //   options: ['Andes', 'Rockies', 'Alps', 'Himalayas'],
//   //   answer: 3,
//   //   difficultyLevel: 'medium',
//   //   explanation:
//   //     'Mount Everest is part of the Himalaya range on the Nepal–China border.',
//   // },
//   // {
//   //   question: 'Which Asian country has the highest GDP per capita as of 2023?',
//   //   options: ['Singapore', 'Japan', 'South Korea', 'India'],
//   //   answer: 0,
//   //   difficultyLevel: 'hard',
//   //   explanation:
//   //     'Singapore leads Asia in GDP per capita due to its advanced services economy.',
//   // },
// ]
