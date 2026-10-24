export type PublicSourceId = 'USGS' | 'NASA EONET'

export type PublicSignal = {
  id: string
  source: PublicSourceId
  sourceLabel: string
  category: string
  title: string
  detail: string
  location: string
  occurredAt: string
  url: string
  latitude?: number
  longitude?: number
  magnitude?: number
}

export type SourceStatus = {
  id: PublicSourceId
  label: string
  status: 'online' | 'offline'
  count: number
  checkedAt: string
  note?: string
}

export type PublicSignalsResponse = { signals: PublicSignal[]; sources: SourceStatus[]; fetchedAt: string }
type UsgsFeature = {
  id?: string
  properties?: { title?: string; place?: string; mag?: number | null; time?: number; url?: string; type?: string }
  geometry?: { coordinates?: number[] | null }
}
type EonetGeometry = { date?: string; type?: string; coordinates?: unknown }
type EonetEvent = {
  id?: string; title?: string; description?: string; link?: string
  categories?: Array<{ id?: string; title?: string }>
  sources?: Array<{ id?: string; url?: string }>
  geometry?: EonetGeometry[]
}
const USGS_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
const EONET_FEED = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=14&limit=60'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: 'application/geo+json, application/json', 'user-agent': 'GodsEyeDashboard/1.0 (public-information dashboard)' },
    signal: AbortSignal.timeout(9000)
  })
  if (!response.ok) throw new Error('Upstream source returned an unsuccessful response')
  return response.json() as Promise<T>
}
function safeHttpsUrl(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback
  try { const parsed = new URL(candidate); return parsed.protocol === 'https:' ? parsed.toString() : fallback }
  catch { return fallback }
}
function validCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180
}

async function getUsgsSignals(): Promise<PublicSignal[]> {
  const data = await fetchJson<{ features?: UsgsFeature[] }>(USGS_FEED)
  return (Array.isArray(data.features) ? data.features : []).slice(0, 250).flatMap((feature): PublicSignal[] => {
    const id = feature.id
    const properties = feature.properties
    const coords = feature.geometry?.coordinates
    if (!id || !properties || typeof properties.time !== 'number') return []
    const mag = typeof properties.mag === 'number' && Number.isFinite(properties.mag) ? properties.mag : undefined
    const place = (properties.place || 'Location not supplied by source').slice(0, 220)
    const depth = coords && typeof coords[2] === 'number' ? coords[2] : undefined
    const longitude = coords?.[0]
    const latitude = coords?.[1]
    return [{
      id: `usgs:${id}`, source: 'USGS', sourceLabel: 'USGS Earthquake Feed', category: 'Earthquakes',
      title: (properties.title || 'Earthquake record').slice(0, 260),
      detail: [mag !== undefined ? `Magnitude ${mag.toFixed(1)}` : 'Magnitude not supplied', depth !== undefined ? `depth ${depth.toFixed(1)} km` : '', place].filter(Boolean).join(' · '),
      location: place, occurredAt: new Date(properties.time).toISOString(),
      url: safeHttpsUrl(properties.url, 'https://earthquake.usgs.gov/earthquakes/feed/'),
      ...(typeof longitude === 'number' && validCoordinate(longitude) ? { longitude } : {}),
      ...(typeof latitude === 'number' && validCoordinate(latitude) && latitude >= -90 && latitude <= 90 ? { latitude } : {}),
      ...(mag !== undefined ? { magnitude: mag } : {})
    }]
  })
}

function pointCoordinates(geometry: EonetGeometry | undefined): { latitude: number; longitude: number } | undefined {
  if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return undefined
  const coords = geometry.coordinates as unknown[]
  const longitude = coords[0], latitude = coords[1]
  if (typeof longitude !== 'number' || !validCoordinate(longitude)) return undefined
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return undefined
  return { latitude, longitude }
}

async function getEonetSignals(): Promise<PublicSignal[]> {
  const data = await fetchJson<{ events?: EonetEvent[] }>(EONET_FEED)
  return (Array.isArray(data.events) ? data.events : []).slice(0, 100).flatMap((event): PublicSignal[] => {
    if (!event.id || !event.title) return []
    const geometries = Array.isArray(event.geometry) ? event.geometry : []
    const newestGeometry = [...geometries].reverse().find((item) => item?.date)
    const occurredAt = newestGeometry?.date && Number.isFinite(Date.parse(newestGeometry.date)) ? new Date(newestGeometry.date).toISOString() : new Date().toISOString()
    const category = event.categories?.map((item) => item?.title).filter(Boolean).join(', ') || 'Natural event'
    const point = geometries.map(pointCoordinates).find((item) => Boolean(item))
    const link = event.sources?.find((item) => item?.url)?.url || event.link
    return [{
      id: `eonet:${event.id}`, source: 'NASA EONET', sourceLabel: 'NASA Earth Observatory EONET',
      category: category.slice(0, 100), title: event.title.slice(0, 260),
      detail: (event.description || `NASA EONET lists this as an open ${category.toLowerCase()} record. Review the linked source for context and updates.`).slice(0, 500),
      location: point ? `${point.latitude.toFixed(2)}°, ${point.longitude.toFixed(2)}°` : 'Location not supplied as a point',
      occurredAt, url: safeHttpsUrl(link, 'https://eonet.gsfc.nasa.gov/'), ...(point || {})
    }]
  })
}

export async function getPublicSignals(): Promise<PublicSignalsResponse> {
  const checkedAt = new Date().toISOString()
  const [usgsResult, eonetResult] = await Promise.allSettled([getUsgsSignals(), getEonetSignals()])
  const usgsSignals = usgsResult.status === 'fulfilled' ? usgsResult.value : []
  const eonetSignals = eonetResult.status === 'fulfilled' ? eonetResult.value : []
  const signals = [...usgsSignals, ...eonetSignals].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 100)
  return {
    signals,
    sources: [
      { id: 'USGS', label: 'USGS earthquakes (past 24 hours)', status: usgsResult.status === 'fulfilled' ? 'online' : 'offline', count: usgsSignals.length, checkedAt, ...(usgsResult.status === 'rejected' ? { note: 'The USGS feed could not be reached. Retry later.' } : {}) },
      { id: 'NASA EONET', label: 'NASA natural events (open, past 14 days)', status: eonetResult.status === 'fulfilled' ? 'online' : 'offline', count: eonetSignals.length, checkedAt, ...(eonetResult.status === 'rejected' ? { note: 'The NASA EONET feed could not be reached. Retry later.' } : {}) }
    ],
    fetchedAt: checkedAt
  }
}
