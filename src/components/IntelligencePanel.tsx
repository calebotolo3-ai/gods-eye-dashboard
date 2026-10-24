import { useEffect, useMemo, useState } from 'react'
import { Activity, CloudSun, Download, ExternalLink, RefreshCw, ShieldAlert, TrafficCone, Wind } from 'lucide-react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type TrafficSample = { id:string; road:string; area:string; latitude:number; longitude:number; currentSpeed:number; freeFlowSpeed:number; delayRatio:number; confidence:number; roadClosure:boolean; status:'free'|'moderate'|'heavy'|'closed'; checkedAt:string; source:string }
type Weather = { temperature:number; feelsLike:number; humidity:number; precipitation:number; windSpeed:number; weatherCode:number; isDay:boolean; checkedAt:string }
type Alert = { id:string; title:string; level:string; eventType:string; date:string; url:string; source:string }
type Data = { traffic:{status:'live'|'setup_required'|'unavailable';samples:TrafficSample[];checkedAt:string;message:string}; weather:{status:'live'|'unavailable';current?:Weather;forecast:Array<{date:string;max:number;min:number;precipitation:number}>;message:string}; alerts:{status:'live'|'unavailable';items:Alert[];checkedAt:string;message:string}; fetchedAt:string }
function speedStatus(status: TrafficSample['status']) { return status === 'closed' ? 'CLOSED' : status === 'heavy' ? 'HEAVY' : status === 'moderate' ? 'SLOW' : 'CLEAR' }
function weatherLabel(code:number) { if(code===0)return 'Clear'; if([1,2,3].includes(code))return 'Partly cloudy'; if([45,48].includes(code))return 'Fog'; if([51,53,55,56,57].includes(code))return 'Drizzle'; if([61,63,65,66,67,80,81,82].includes(code))return 'Rain'; if([71,73,75,77,85,86].includes(code))return 'Snow'; if([95,96,99].includes(code))return 'Thunderstorm'; return 'Conditions updated' }
export default function IntelligencePanel() {
  const [data,setData]=useState<Data|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  async function load() {
    setLoading(true); setError('')
    try { const response=await fetch('/api/intelligence',{headers:{accept:'application/json'}}); const payload=await response.json() as Data & {error?:string}; if(!response.ok)throw new Error(payload.error||'Intelligence feed unavailable'); setData(payload) }
    catch(reason) { setError(reason instanceof Error?reason.message:'Intelligence feed unavailable') }
    finally { setLoading(false) }
  }
  useEffect(()=>{void load()},[])
  const congestion=useMemo(()=>data?.traffic.samples.filter(x=>x.status==='heavy'||x.status==='closed').length||0,[data])
  function exportReport() {
    if(!data)return
    const rows=[['Gods Eye situational report',new Date().toISOString()],['Traffic provider status',data.traffic.status],['Road','Area','Current km/h','Free-flow km/h','Status','Confidence'],...data.traffic.samples.map(x=>[x.road,x.area,String(x.currentSpeed),String(x.freeFlowSpeed),speedStatus(x.status),String(Math.round(x.confidence*100))+'%']),[],['Nairobi weather',data.weather.status],['Temperature C',String(data.weather.current?.temperature??'N/A')],['Feels like C',String(data.weather.current?.feelsLike??'N/A')],['Humidity %',String(data.weather.current?.humidity??'N/A')],[],['GDACS alerts',data.alerts.status],['Title','Level','Type','Date'],...data.alerts.items.map(x=>[x.title,x.level,x.eventType,x.date])]
    const csv=rows.map(row=>row.map(cell=>'"'+String(cell??'').replace(/"/g,'""')+'"').join(',')).join('\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const a=document.createElement('a'); a.href=url; a.download='gods-eye-situational-report.csv'; a.click(); URL.revokeObjectURL(url)
  }
  const weather=data?.weather.current
  return <section className="intelligence-section">
    <div className="intelligence-heading"><div><div className="panel-kicker">LIVE SITUATIONAL AWARENESS</div><h2>Traffic, weather & global alerts</h2><p>Real-world conditions from attributed public and commercial data providers.</p></div><div className="intelligence-actions"><button className="subtle-button" onClick={()=>void load()} disabled={loading}><RefreshCw size={13}/>{loading?'Updating':'Refresh'}</button><button className="primary-button" onClick={exportReport} disabled={!data}><Download size={14}/> Export report</button></div></div>
    {error&&<div className="intelligence-notice warning">{error}</div>}
    <div className="intelligence-grid">
      <article className="panel intel-card traffic-card">
        <div className="intel-title"><div className="intel-icon"><TrafficCone size={17}/></div><div><span>NAIROBI ROAD NETWORK</span><h3>Live road traffic</h3></div><i className={data?.traffic.status==='live'?'dot-live':'dot-offline'}/></div>
        <div className="traffic-summary"><strong>{data?.traffic.samples.length??'—'}</strong><span>road segments sampled</span><strong>{congestion}</strong><span>heavy / closed</span></div>
        {data?.traffic.status==='setup_required'&&<div className="intelligence-notice">Live traffic is ready to connect. Add the server-side <code>TOMTOM_API_KEY</code> in Vercel → Project Settings → Environment Variables, then redeploy. <a href="https://developer.tomtom.com/" target="_blank" rel="noreferrer">TomTom developer portal <ExternalLink size={11}/></a></div>}
        {data?.traffic.status==='unavailable'&&<div className="intelligence-notice warning">{data.traffic.message}</div>}
        {data?.traffic.samples.length ? <div className="traffic-map"><MapContainer center={[-1.2864,36.8172]} zoom={11} scrollWheelZoom={false} style={{height:'235px',width:'100%'}}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/><>{data.traffic.samples.map(item=><CircleMarker key={item.id} center={[item.latitude,item.longitude]} radius={9} pathOptions={{color:item.status==='heavy'||item.status==='closed'?'#e58e7c':item.status==='moderate'?'#e0bd6c':'#79c49a',fillOpacity:.85,weight:2}}><Popup><b>{item.road}</b><br/>{Math.round(item.currentSpeed)} km/h · {speedStatus(item.status)}<br/>Free-flow: {Math.round(item.freeFlowSpeed)} km/h<br/>Source: TomTom Traffic Flow</Popup></CircleMarker>)}</>}</MapContainer></div>:null}
        <div className="traffic-list">{(data?.traffic.samples||[]).map(item=><div className="traffic-row" key={item.id}><div><b>{item.road}</b><span>{item.area}</span></div><div className="traffic-speed"><strong>{Math.round(item.currentSpeed)}</strong><small>km/h</small></div><span className={'traffic-state '+item.status}>{speedStatus(item.status)}</span><div className="traffic-meter"><i style={{width:Math.max(3,Math.min(100,(item.currentSpeed/Math.max(item.freeFlowSpeed,1))*100))+'%'}}/></div></div>)}</div>
        <div className="intel-foot">{data?.traffic.message||'Waiting for traffic provider…'} {data?.traffic.status==='live'?'Source: TomTom Traffic Flow.':''}</div>
      </article>
      <article className="panel intel-card weather-card">
        <div className="intel-title"><div className="intel-icon"><CloudSun size={17}/></div><div><span>NAIROBI · KENYA</span><h3>Weather conditions</h3></div><i className={data?.weather.status==='live'?'dot-live':'dot-offline'}/></div>
        {weather?<><div className="weather-current"><strong>{Math.round(weather.temperature)}°</strong><div><b>{weatherLabel(weather.weatherCode)}</b><span>Feels like {Math.round(weather.feelsLike)}°C</span></div></div><div className="weather-stats"><div><span>HUMIDITY</span><b>{weather.humidity}%</b></div><div><span>WIND</span><b><Wind size={12}/>{Math.round(weather.windSpeed)} km/h</b></div><div><span>RAINFALL</span><b>{weather.precipitation} mm</b></div></div><div className="forecast-list">{data?.weather.forecast.map(day=><div key={day.date}><span>{new Date(day.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'})}</span><b>{Math.round(day.max)}° / {Math.round(day.min)}°</b><small>{day.precipitation} mm</small></div>)}</div></>:<div className="empty-state">{data?.weather.message||'Loading weather…'}</div>}
        <div className="intel-foot">Source: Open-Meteo · Current conditions and 5-day forecast</div>
      </article>
    </div>
    <article className="panel alert-panel">
      <div className="panel-head"><div><div className="panel-kicker">GLOBAL DISASTER ALERTS</div><h2><ShieldAlert size={15}/> Public emergency & hazard reports</h2></div><span className="count-pill">{data?.alerts.items.length??'—'} alerts</span></div>
      <p className="alert-description">{data?.alerts.message||'Loading GDACS public alerts…'}</p>
      {data?.alerts.status==='live'&&data.alerts.items.length>0?<div className="alert-list">{data.alerts.items.slice(0,8).map(item=><div className="alert-row" key={item.id}><div><b>{item.title}</b><span>{item.eventType} · {item.date||'Date not supplied'}</span></div><span className={'alert-level '+item.level.toLowerCase()}>{item.level}</span><a href={item.url} target="_blank" rel="noreferrer" aria-label="Open original GDACS alert"><ExternalLink size={14}/></a></div>)}</div>:<div className="empty-state">{data?.alerts.status==='live'?'No red or orange GDACS alerts returned in the selected 14-day window.':data?.alerts.message||'Loading public alerts…'}</div>}
      <div className="intel-foot">Source: Global Disaster Alert and Coordination System (GDACS). Always check official local authorities for safety instructions.</div>
    </article>
    <div className="intelligence-disclaimer"><Activity size={14}/> Traffic covers sampled road segments around Nairobi, not every road. Weather is centered on Nairobi. Data availability and provider coverage vary; no values are fabricated when a source is disconnected.</div>
  </section>
}
