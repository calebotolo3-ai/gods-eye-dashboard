export type AnalyticsPoint = { date: string; usgs: number; eonet: number; total: number }
export type AnalyticsResponse = {
  days: 7 | 30
  points: AnalyticsPoint[]
  categories: Array<{ name: string; count: number }>
  sources: Array<{ id: 'USGS' | 'NASA EONET'; status: 'online' | 'offline'; count: number }>
  fetchedAt: string
  windowStart: string
  windowEnd: string
  note: string
}

type UsgsFeature = { properties?: { time?: number } }
type EonetEvent = { categories?: Array<{ title?: string }>; geometry?: Array<{ date?: string }> }

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: 'application/geo+json, application/json', 'user-agent': 'GodsEyeDashboard/1.0 (public-information dashboard)' },
    signal: AbortSignal.timeout(9000)
  })
  if (!response.ok) throw new Error('An upstream source returned an unsuccessful response')
  return response.json() as Promise<T>
}

function dayKey(value: string | number): string | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

export async function getAnalytics(days: 7 | 30 = 30): Promise<AnalyticsResponse> {
  const now = new Date()
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  const [usgsResult, eonetResult] = await Promise.allSettled([
    fetchJson<{ features?: UsgsFeature[] }>('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'),
    fetchJson<{ events?: EonetEvent[] }>('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=500')
  ])
  const buckets = new Map<string, { usgs: number; eonet: number }>()
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + offset)
    buckets.set(date.toISOString().slice(0, 10), { usgs: 0, eonet: 0 })
  }
  const categories = new Map<string, number>()
  const usgs = usgsResult.status === 'fulfilled' ? (usgsResult.value.features || []) : []
  for (const feature of usgs) {
    const key = typeof feature.properties?.time === 'number' ? dayKey(feature.properties.time) : null
    const bucket = key ? buckets.get(key) : undefined
    if (bucket) bucket.usgs++
    if (bucket) categories.set('Earthquakes', (categories.get('Earthquakes') || 0) + 1)
  }
  const eonet = eonetResult.status === 'fulfilled' ? (eonetResult.value.events || []) : []
  for (const event of eonet) {
    const dates = Array.isArray(event.geometry) ? event.geometry.map(item => item.date).filter((date): date is string => Boolean(date)) : []
    const key = dates.length ? dayKey(dates[dates.length - 1] as string) : null
    const bucket = key ? buckets.get(key) : undefined
    if (!bucket) continue
    bucket.eonet++
    const names = event.categories?.map(item => item.title).filter((name): name is string => Boolean(name)) || []
    for (const name of names.length ? names : ['Natural events']) categories.set(name.slice(0, 80), (categories.get(name.slice(0, 80)) || 0) + 1)
  }
  const points = [...buckets.entries()].map(([date, counts]) => ({ date, ...counts, total: counts.usgs + counts.eonet }))
  const fetchedAt = now.toISOString()
  return {
    days, points,
    categories: [...categories.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    sources: [
      { id: 'USGS', status: usgsResult.status === 'fulfilled' ? 'online' : 'offline', count: usgs.length },
      { id: 'NASA EONET', status: eonetResult.status === 'fulfilled' ? 'online' : 'offline', count: eonet.length }
    ],
    fetchedAt, windowStart: start.toISOString(), windowEnd: fetchedAt,
    note: 'Rolling source snapshot, not a complete historical archive. USGS contributes its monthly feed; NASA EONET contributes currently open events with dated geometry. Source coverage and event dates can differ.'
  }
}
