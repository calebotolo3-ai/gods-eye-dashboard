import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { getPublicSignals } from './server/publicSignals'
import { getAnalytics } from './server/analytics'
import { getIntelligence } from './server/intelligence'
import { allowSummaryRequest } from './server/rateLimit'
import { createAiSummary, SummaryConfigurationError, SummaryProviderError, validateSummaryInput } from './server/summarize'

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(JSON.stringify(body))
}

function localApiPlugin(): Plugin {
  return {
    name: 'gods-eye-local-api',
    configureServer(server) {
      server.middlewares.use('/api/intelligence', (request, response) => {
        if (request.method !== 'GET') {
          response.setHeader('Allow', 'GET')
          sendJson(response, 405, { error: 'Method not allowed' })
          return
        }
        response.setHeader('Cache-Control', 'no-store')
        void getIntelligence().then(
          (payload) => sendJson(response, 200, payload),
          () => sendJson(response, 502, { error: 'Intelligence sources could not be reached.' })
        )
      })

      server.middlewares.use('/api/analytics', (request, response) => {
        if (request.method !== 'GET') {
          response.setHeader('Allow', 'GET')
          sendJson(response, 405, { error: 'Method not allowed' })
          return
        }
        const requested = Number(new URL(request.url || '/', 'http://localhost').searchParams.get('days') || 30)
        const days: 7 | 30 = requested === 7 ? 7 : 30
        response.setHeader('Cache-Control', 'no-store')
        void getAnalytics(days).then(
          (payload) => sendJson(response, 200, payload),
          () => sendJson(response, 502, { error: 'Analytics sources could not be reached. Try again later.' })
        )
      })

      server.middlewares.use('/api/signals', (request, response) => {
        if (request.method !== 'GET') {
          response.setHeader('Allow', 'GET')
          sendJson(response, 405, { error: 'Method not allowed' })
          return
        }
        response.setHeader('Cache-Control', 'no-store')
        void getPublicSignals().then(
          (payload) => sendJson(response, 200, payload),
          () => sendJson(response, 502, { error: 'Public source aggregation failed. Try again later.' })
        )
      })

      server.middlewares.use('/api/summarize', (request, response) => {
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST')
          sendJson(response, 405, { error: 'Method not allowed' })
          return
        }
        let raw = ''
        let tooLarge = false
        request.on('data', (chunk: unknown) => {
          raw += String(chunk)
          if (raw.length > 8192) tooLarge = true
        })
        request.on('end', () => {
          if (tooLarge) {
            sendJson(response, 413, { error: 'Request body is too large.' })
            return
          }
          let body: Record<string, unknown>
          try {
            body = JSON.parse(raw || '{}') as Record<string, unknown>
          } catch {
            sendJson(response, 400, { error: 'Request body must be valid JSON.' })
            return
          }
          const forwarded = request.headers['x-forwarded-for']
          const client = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) || request.socket.remoteAddress || 'local-client'
          if (!allowSummaryRequest(client.trim())) {
            sendJson(response, 429, { error: 'Summary request limit reached. Wait a minute before trying again.' })
            return
          }
          const signal = validateSummaryInput(body.signal)
          if (!signal) {
            sendJson(response, 400, { error: 'A valid public source record is required.' })
            return
          }
          void createAiSummary(signal).then(
            (summary) => sendJson(response, 200, { summary, mode: 'gemini', generatedAt: new Date().toISOString() }),
            (error: unknown) => {
              if (error instanceof SummaryConfigurationError) {
                sendJson(response, 503, { error: error.message })
              } else if (error instanceof SummaryProviderError) {
                sendJson(response, error.statusCode, { error: error.message })
              } else {
                sendJson(response, 502, { error: 'Unable to generate a summary right now. Try again later.' })
              }
            }
          )
        })
        request.on('error', () => {
          if (!response.headersSent) sendJson(response, 400, { error: 'Could not read request body.' })
        })
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['GEMINI_API_KEY', 'GEMINI_MODEL', 'TOMTOM_API_KEY']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key]
  }
  return { plugins: [react(), localApiPlugin()] }
})
