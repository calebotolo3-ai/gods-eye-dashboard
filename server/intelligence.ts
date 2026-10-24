export type TrafficSample = {
  id: string; road: string; area: string; latitude: number; longitude: number
  currentSpeed: number; freeFlowSpeed: number; delayRatio: number; confidence: number
  roadClosure: boolean; status: 'free' | 'moderate' | 'heavy' | 'closed'
  checkedAt: string; source: string
}
export type WeatherSnapshot = {
  temperature: number; feelsLike: number; humidity: number; precipitation: number
  windSpeed: number; weatherCode: number; isDay: boolean; checkedAt: string
}
export type AlertRecord = {
  id: string; title: string; level: string; eventType: string; date: string
  url: string; latitude?: number; longitude?: number; source: string
}
export type IntelligenceResponse = {
  traffic: { status: 'live' | 'setup_required' | 'unavailable'; samples: TrafficSample[]; checkedAt: string; message: string }
  weather: { status: 'live' | 'unavailable'; current?: WeatherSnapshot; forecast: Array<{date:string; max:number; min:number; precipitation:number}>; message: string }
  alerts: { status: 'live' | 'unavailable'; items: AlertRecord[]; checkedAt: string; message: string }
  fetchedAt: string
}

const roads = [
  { id: 'thika-road', road: 'Thika Road / A2', area: 'Kasarani corridor', latitude: -1.2186, longitude: 36.8874 },
  { id: 'waiyaki-way', road: 'Waiyaki Way', area: 'Westlands', latitude: -1.2678, longitude: 36.7902 },
  { id: 'uhuru-highway', road: 'Uhuru Highway', area: 'CBD / Museum Hill', latitude: -1.2866, longitude: 36.8155 },
  { id: 'mombasa-road', road: 'Mombasa Road / A8', area: 'Industrial Area', latitude: -1.3272, longitude: 36.8585 },
  { id: 'langata-road', road: 'Lang’ata Road', area: 'Wilson / Lang’ata', latitude: -1.3224, longitude: 36.7878 },
  { id: 'kiambu-road', road: 'Kiambu Road', area: 'Muthaiga / Ridgeways', latitude: -1.2471, longitude: 36.8361 },
  { id: 'ngong-road', road: 'Ngong Road', area: 'Adams Arcade', latitude: -1.3009, longitude: 36.7828 },
  { id: 'eastern-bypass', road: 'Eastern Bypass', area: 'Ruiru approach', latitude: -1.1648, longitude: 36.9637 }
]
const checkedAt = () => new Date().toISOString()
async function getTraffic(): Promise<IntelligenceResponse['traffic']> {
  const key = process.env.TOMTOM_API_KEY
  if (!key) return { status: 'setup_required', samples: [], checkedAt: checkedAt(), message: 'Add TOMTOM_API_KEY in Vercel Environment Variables to enable live road speeds. No traffic values are simulated.' }
  const results = await Promise.allSettled(roads.map(async (road): Promise<TrafficSample> => {
    const url = new URL(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`)
    url.searchParams.set('key', key)
    url.searchParams.set('point', `${road.latitude},${road.longitude}`)
    url.searchParams.set('unit', 'kmph')
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(7000) })
    if (!response.ok) throw new Error('Traffic provider request failed')
    const payload = await response.json() as { flowSegmentData?: { currentSpeed?: number; freeFlowSpeed?: number; confidence?: number; roadClosure?: boolean } }
    const flow = payload.flowSegmentData
    if (!flow || typeof flow.currentSpeed !== 'number' || typeof flow.freeFlowSpeed !== 'number') throw new Error('Traffic provider returned incomplete flow data')
    const delayRatio = flow.freeFlowSpeed > 0 ? Math.max(0, 1 - flow.currentSpeed / flow.freeFlowSpeed) : 0
    const roadClosure = flow.roadClosure === true
    const status = roadClosure ? 'closed' : delayRatio >= .55 ? 'heavy' : delayRatio >= .25 ? 'moderate' : 'free'
    return { ...road, currentSpeed: flow.currentSpeed, freeFlowSpeed: flow.freeFlowSpeed, delayRatio, confidence: typeof flow.confidence === 'number' ? flow.confidence : 0, roadClosure, status, checkedAt: checkedAt(), source: 'TomTom Traffic Flow' }
  }))
  const samples = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  return { status: samples.length ? 'live' : 'unavailable', samples, checkedAt: checkedAt(), message: samples.length ? 'Live observed speeds for sampled road segments. This is not a complete citywide traffic census.' : 'The traffic provider did not return usable road-flow data. Check the API key, quota and coverage.' }
}
async function getWeather(): Promise<IntelligenceResponse['weather']> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.search = new URLSearchParams({ latitude: '-1.2864', longitude: '36.8172', current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', forecast_days: '5', timezone: 'Africa/Nairobi' }).toString()
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(7000) })
    if (!response.ok) throw new Error('Weather source unavailable')
    const payload = await response.json() as { current?: Record<string, number>; daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[] } }
    const c = payload.current
    if (!c || typeof c.temperature_2m !== 'number') throw new Error('Weather data incomplete')
    const d = payload.daily
    const forecast = (d?.time || []).map((date, i) => ({ date, max: d?.temperature_2m_max?.[i] ?? 0, min: d?.temperature_2m_min?.[i] ?? 0, precipitation: d?.precipitation_sum?.[i] ?? 0 }))
    return { status: 'live', current: { temperature: c.temperature_2m, feelsLike: c.apparent_temperature ?? c.temperature_2m, humidity: c.relative_humidity_2m ?? 0, precipitation: c.precipitation ?? 0, windSpeed: c.wind_speed_10m ?? 0, weatherCode: c.weather_code ?? 0, isDay: c.is_day === 1, checkedAt: checkedAt() }, forecast, message: 'Current conditions and forecast for Nairobi from Open-Meteo.' }
  } catch {
    return { status: 'unavailable', forecast: [], message: 'Weather data is temporarily unavailable.' }
  }
}
async function getAlerts(): Promise<IntelligenceResponse['alerts']> {
  try {
    const url = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromdate=' + encodeURIComponent(new Date(Date.now() - 14 * 86400000).toISOString().slice(0,10)) + '&todate=' + encodeURIComponent(new Date().toISOString().slice(0,10)) + '&alertlevel=red;orange'
    const response = await fetch(url, { headers: { accept: 'application/geo+json, application/json' }, signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error('Alert source unavailable')
    const payload = await response.json() as { features?: Array<{ id?: string | number; properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }> }
    const items = (payload.features || []).slice(0, 60).map((feature, i) => {
      const p = feature.properties || {}
      const coords = feature.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates) ? feature.geometry.coordinates as number[] : []
      const rawUrl = typeof p.url === 'string' ? p.url : typeof p.htmldescription === 'string' ? p.htmldescription : 'https://www.gdacs.org/'
      let safeUrl = 'https://www.gdacs.org/'
      try { const parsed = new URL(rawUrl); if (parsed.protocol === 'https:') safeUrl = parsed.toString() } catch {}
      return { id: String(feature.id ?? i), title: String(p.name ?? p.eventname ?? p.title ?? 'Global disaster alert').slice(0,180), level: String(p.alertlevel ?? p.alertLevel ?? 'Alert'), eventType: String(p.eventtype ?? p.eventType ?? 'Event'), date: String(p.fromdate ?? p.fromDate ?? ''), url: safeUrl, ...(typeof coords[0] === 'number' && typeof coords[1] === 'number' ? { longitude: coords[0], latitude: coords[1] } : {}), source: 'GDACS' }
    })
    return { status: 'live', items, checkedAt: checkedAt(), message: 'Red and orange global alerts issued by GDACS in the past 14 days. Review the source record for official details.' }
  } catch {
    return { status: 'unavailable', items: [], checkedAt: checkedAt(), message: 'GDACS alerts are temporarily unavailable.' }
  }
}
export async function getIntelligence(): Promise<IntelligenceResponse> {
  const [traffic, weather, alerts] = await Promise.all([getTraffic(), getWeather(), getAlerts()])
  return { traffic, weather, alerts, fetchedAt: checkedAt() }
}
