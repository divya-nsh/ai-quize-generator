import { createServerFn } from '@tanstack/react-start'
import { generateQuize, generateHint } from './app.server'
import z from 'zod'

// RPC: Server execution, callable from client
export const generateQuizeServerFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      topic: z.string().max(500),
      totalQuestions: z.number().min(1).max(50),
    }),
  )
  .handler(async ({ data }) => {
    const questions = await generateQuize(data.topic, data.totalQuestions)
    return questions
  })

export const generateHintServerFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    return generateHint(data.question, data.options)
  })
