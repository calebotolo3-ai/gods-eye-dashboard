import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPublicSignals } from '../server/publicSignals'

export default async function handler(_request: VercelRequest, response: VercelResponse) {
  if (_request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    return response.status(200).json(await getPublicSignals())
  } catch {
    return response.status(502).json({ error: 'Public source aggregation failed. Try again later.' })
  }
}
