import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAnalytics } from '../server/analytics'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const requested = Number(request.query.days || 30)
  const days: 7 | 30 = requested === 7 ? 7 : 30
  response.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  try { return response.status(200).json(await getAnalytics(days)) }
  catch { return response.status(502).json({ error: 'Analytics sources could not be reached. Try again later.' }) }
}
