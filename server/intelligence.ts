export type TrafficSample = {
  id: string; road: string; area: string; city: string; country: string
  latitude: number; longitude: number; currentSpeed: number; freeFlowSpeed: number
  delayRatio: number; confidence: number; roadClosure: boolean
  status: 'free' | 'moderate' | 'heavy' | 'closed'; checkedAt: string; source: string
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

// Representative public-road sampling points across major metro areas.
// This is not a complete road census; provider coverage and API quotas apply.
const roads = [
  { id:'nairobi-thika', road:'Thika Road / A2', area:'Kasarani corridor', city:'Nairobi', country:'Kenya', latitude:-1.2186, longitude:36.8874 },
  { id:'nairobi-waiyaki', road:'Waiyaki Way', area:'Westlands', city:'Nairobi', country:'Kenya', latitude:-1.2678, longitude:36.7902 },
  { id:'nairobi-mombasa', road:'Mombasa Road / A8', area:'Industrial Area', city:'Nairobi', country:'Kenya', latitude:-1.3272, longitude:36.8585 },
  { id:'nairobi-eastern', road:'Eastern Bypass', area:'Ruiru approach', city:'Nairobi', country:'Kenya', latitude:-1.1648, longitude:36.9637 },
  { id:'london-a4', road:'A4 Great West Road', area:'Hammersmith', city:'London', country:'United Kingdom', latitude:51.4927, longitude:-0.2246 },
  { id:'london-a40', road:'A40 Westway', area:'Paddington', city:'London', country:'United Kingdom', latitude:51.5208, longitude:-0.1833 },
  { id:'newyork-broadway', road:'Broadway', area:'Midtown Manhattan', city:'New York', country:'United States', latitude:40.7549, longitude:-73.9840 },
  { id:'newyork-fdr', road:'FDR Drive', area:'Upper East Side', city:'New York', country:'United States', latitude:40.7752, longitude:-73.9430 },
  { id:'singapore-pie', road:'Pan Island Expressway', area:'Central Singapore', city:'Singapore', country:'Singapore', latitude:1.3260, longitude:103.8420 },
  { id:'singapore-cte', road:'Central Expressway', area:'Novena', city:'Singapore', country:'Singapore', latitude:1.3205, longitude:103.8430 },
  { id:'saopaulo-marginal', road:'Marginal Pinheiros', area:'Pinheiros', city:'São Paulo', country:'Brazil', latitude:-23.5705, longitude:-46.7010 },
  { id:'saopaulo-paulista', road:'Avenida Paulista', area:'Bela Vista', city:'São Paulo', country:'Brazil', latitude:-23.5631, longitude:-46.6544 },
  { id:'tokyo-shuto', road:'Shuto Expressway', area:'Minato', city:'Tokyo', country:'Japan', latitude:35.6586, longitude:139.7454 },
  { id:'tokyo-yamate', road:'Yamate-dori', area:'Shinjuku', city:'Tokyo', country:'Japan', latitude:35.6938, longitude:139.7034 },
  { id:'sydney-m1', road:'M1 Pacific Motorway', area:'North Sydney', city:'Sydney', country:'Australia', latitude:-33.8400, longitude:151.2070 },
  { id:'sydney-parramatta', road:'Parramatta Road', area:'Camperdown', city:'Sydney', country:'Australia', latitude:-33.8890, longitude:151.1760 },
  { id:'dubai-sheikh', road:'Sheikh Zayed Road', area:'Trade Centre', city:'Dubai', country:'United Arab Emirates', latitude:25.2190, longitude:55.2790 },
  { id:'dubai-al-khail', road:'Al Khail Road', area:'Business Bay', city:'Dubai', country:'United Arab Emirates', latitude:25.1780, longitude:55.2570 }
]
const checkedAt = () => new Date().toISOString()
async function getTraffic(): Promise<IntelligenceResponse['traffic']> {
  const key = process.env.TOMTOM_API_KEY
  if (!key) return { status:'setup_required', samples:[], checkedAt:checkedAt(), message:'Add TOMTOM_API_KEY as a server-side Vercel environment variable to enable live sampled road speeds across the listed cities. No traffic values are simulated.' }
  const results = await Promise.allSettled(roads.map(async (road): Promise<TrafficSample> => {
    const url = new URL('https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json')
    url.searchParams.set('key', key)
    url.searchParams.set('point', `${road.latitude},${road.longitude}`)
    url.searchParams.set('unit', 'kmph')
    const response = await fetch(url, { headers:{accept:'application/json'}, signal:AbortSignal.timeout(7000) })
    if (!response.ok) throw new Error('Traffic provider request failed')
    const payload = await response.json() as { flowSegmentData?: { currentSpeed?:number; freeFlowSpeed?:number; confidence?:number; roadClosure?:boolean } }
    const flow = payload.flowSegmentData
    if (!flow || typeof flow.currentSpeed !== 'number' || typeof flow.freeFlowSpeed !== 'number') throw new Error('Traffic provider returned incomplete flow data')
    const delayRatio = flow.freeFlowSpeed > 0 ? Math.max(0,1-flow.currentSpeed/flow.freeFlowSpeed) : 0
    const roadClosure = flow.roadClosure === true
    const status = roadClosure ? 'closed' : delayRatio >= .55 ? 'heavy' : delayRatio >= .25 ? 'moderate' : 'free'
    return { ...road, currentSpeed:flow.currentSpeed, freeFlowSpeed:flow.freeFlowSpeed, delayRatio, confidence:typeof flow.confidence==='number'?flow.confidence:0, roadClosure, status, checkedAt:checkedAt(), source:'TomTom Traffic Flow' }
  }))
  const samples = results.flatMap(result=>result.status==='fulfilled'?[result.value]:[])
  const failed = results.length-samples.length
  return { status:samples.length?'live':'unavailable', samples, checkedAt:checkedAt(), message:samples.length ? `Live observed speeds for ${samples.length} sampled road segments across ${new Set(samples.map(x=>x.city)).size} cities. ${failed} samples unavailable. This is not a complete global road census.` : 'The traffic provider returned no usable road-flow data. Check the API key, quota and geographic coverage.' }
}
async function getWeather(): Promise<IntelligenceResponse['weather']> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.search = new URLSearchParams({latitude:'-1.2864',longitude:'36.8172',current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',daily:'temperature_2m_max,temperature_2m_min,precipitation_sum',forecast_days:'5',timezone:'Africa/Nairobi'}).toString()
    const response = await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(7000)})
    if(!response.ok) throw new Error('Weather source unavailable')
    const payload = await response.json() as {current?:Record<string,number>;daily?:{time?:string[];temperature_2m_max?:number[];temperature_2m_min?:number[];precipitation_sum?:number[]}}
    const c=payload.current
    if(!c||typeof c.temperature_2m!=='number') throw new Error('Weather data incomplete')
    const d=payload.daily
    const forecast=(d?.time||[]).map((date,i)=>({date,max:d?.temperature_2m_max?.[i]??0,min:d?.temperature_2m_min?.[i]??0,precipitation:d?.precipitation_sum?.[i]??0}))
    return {status:'live',current:{temperature:c.temperature_2m,feelsLike:c.apparent_temperature??c.temperature_2m,humidity:c.relative_humidity_2m??0,precipitation:c.precipitation??0,windSpeed:c.wind_speed_10m??0,weatherCode:c.weather_code??0,isDay:c.is_day===1,checkedAt:checkedAt()},forecast,message:'Current conditions and five-day forecast for Nairobi from Open-Meteo.'}
  } catch { return {status:'unavailable',forecast:[],message:'Weather data is temporarily unavailable.'} }
}
async function getAlerts(): Promise<IntelligenceResponse['alerts']> {
  try {
    const url='https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromdate='+encodeURIComponent(new Date(Date.now()-14*86400000).toISOString().slice(0,10))+'&todate='+encodeURIComponent(new Date().toISOString().slice(0,10))+'&alertlevel=red;orange'
    const response=await fetch(url,{headers:{accept:'application/geo+json, application/json'},signal:AbortSignal.timeout(8000)})
    if(!response.ok) throw new Error('Alert source unavailable')
    const payload=await response.json() as {features?:Array<{id?:string|number;properties?:Record<string,unknown>;geometry?:{type?:string;coordinates?:unknown}}>}
    const items=(payload.features||[]).slice(0,60).map((feature,i)=>{
      const p=feature.properties||{}
      const coords=feature.geometry?.type==='Point'&&Array.isArray(feature.geometry.coordinates)?feature.geometry.coordinates as number[]:[]
      const rawUrl=typeof p.url==='string'?p.url:typeof p.htmldescription==='string'?p.htmldescription:'https://www.gdacs.org/'
      let safeUrl='https://www.gdacs.org/'
      try {const parsed=new URL(rawUrl);if(parsed.protocol==='https:')safeUrl=parsed.toString()} catch {}
      return {id:String(feature.id??i),title:String(p.name??p.eventname??p.title??'Global disaster alert').slice(0,180),level:String(p.alertlevel??p.alertLevel??'Alert'),eventType:String(p.eventtype??p.eventType??'Event'),date:String(p.fromdate??p.fromDate??''),url:safeUrl,...(typeof coords[0]==='number'&&typeof coords[1]==='number'?{longitude:coords[0],latitude:coords[1]}:{}),source:'GDACS'}
    })
    return {status:'live',items,checkedAt:checkedAt(),message:'Red and orange global alerts issued by GDACS in the past 14 days. Review the original source record for official details.'}
  } catch {return {status:'unavailable',items:[],checkedAt:checkedAt(),message:'GDACS alerts are temporarily unavailable.'}}
}
export async function getIntelligence(): Promise<IntelligenceResponse> {
  const [traffic,weather,alerts]=await Promise.all([getTraffic(),getWeather(),getAlerts()])
  return {traffic,weather,alerts,fetchedAt:checkedAt()}
}
