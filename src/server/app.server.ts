import Groq from 'groq-sdk'
import z from 'zod'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const schema = z.array(
  z.object({
    question: z.string(),
    options: z.array(z.string()),
    answer: z.number().describe('zero-based index of the correct option'),
    //    difficultyLevel: z.string().describe('easy | medium | hard'),
    explanation: z
      .string()
      .describe('short 2-3 sentence explanation of why the answer is correct'),
  }),
)

export type TQuestions = z.infer<typeof schema>

export async function generateQuize(
  topic: string,
  totalQuestions: number,
): Promise<TQuestions> {
  const res = await groq.chat.completions.create({
    response_format: {
      type: 'json_schema',
      json_schema: {
        strict: false,
        name: 'mcq_question',
        schema: z.toJSONSchema(schema),
      },
    },
    reasoning_effort: 'low',
    messages: [
      {
        role: 'system',
        content: `You are an MCQ generator. Generate exactly ${totalQuestions} MCQ questions on the user's topic. Each question must have strictly 4 options and a short 2-3 sentence explanation of the correct answer or any fun fact optionally, Output JSON only.`,
      },
      { role: 'user', content: topic },
    ],
    model: 'openai/gpt-oss-120b',
  })

  return JSON.parse(res.choices[0]!.message.content!) as TQuestions
}

export async function generateHint(
  question: string,
  options: string[],
): Promise<string> {
  const res = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful quiz assistant. Give a single short hint (1 sentence, max 20 words) that helps the user narrow down the answer without revealing it directly.',
      },
      {
        role: 'user',
        content: `Question: ${question}\nOptions: ${options.join(', ')}`,
      },
    ],
    model: 'openai/gpt-oss-120b',
  })
  // console.log('Hint Response:', res.choices[0]!.message.content)
  return res.choices[0]!.message.content!.trim()
}
