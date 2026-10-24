import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowSummaryRequest } from '../server/rateLimit'
import { createAiSummary, SummaryConfigurationError, SummaryProviderError, validateSummaryInput } from '../server/summarize'

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } }

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const forwarded = request.headers['x-forwarded-for']
  const client = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) || 'unknown-client'
  if (!allowSummaryRequest(client.trim())) {
    return response.status(429).json({ error: 'Summary request limit reached. Wait a minute before trying again.' })
  }

  const body = request.body && typeof request.body === 'object' ? request.body as Record<string, unknown> : {}
  const signal = validateSummaryInput(body.signal)
  if (!signal) return response.status(400).json({ error: 'A valid public source record is required.' })

  try {
    const summary = await createAiSummary(signal)
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    return response.status(200).json({ summary, mode: 'gemini', generatedAt: new Date().toISOString() })
  } catch (error) {
    if (error instanceof SummaryConfigurationError) return response.status(503).json({ error: error.message })
    if (error instanceof SummaryProviderError) return response.status(error.statusCode).json({ error: error.message })
    return response.status(502).json({ error: 'Unable to generate a summary right now. Try again later.' })
  }
}
