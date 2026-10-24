import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getIntelligence } from '../server/intelligence'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  response.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=180')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    return response.status(200).json(await getIntelligence())
  } catch {
    return response.status(502).json({ error: 'Intelligence sources could not be reached.' })
  }
}
