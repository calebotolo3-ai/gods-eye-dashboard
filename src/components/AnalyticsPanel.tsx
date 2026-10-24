import { useEffect, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Point = { date: string; usgs: number; eonet: number; total: number }
type Payload = { points: Point[]; categories: Array<{ name: string; count: number }>; sources: Array<{ id: string; status: string; count: number }>; fetchedAt: string; note: string; windowStart: string; windowEnd: string }
export default function AnalyticsPanel() {
  const [days, setDays] = useState<7 | 30>(30)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function load(range: 7 | 30) {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/analytics?days=' + range, { headers: { accept: 'application/json' } })
      const payload = await response.json() as Payload & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Analytics are unavailable.')
      setData(payload)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Analytics are unavailable.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load(days) }, [days])
  const total = data?.points.reduce((sum, point) => sum + point.total, 0) || 0
  return <section className="panel analytics-panel">
    <div className="panel-head"><div><div className="panel-kicker">PHASE 4 · SOURCE-ATTRIBUTED ANALYTICS</div><h2>Observed activity trend</h2></div>
      <div className="analytics-controls"><button className={days === 7 ? 'filter-chip selected' : 'filter-chip'} onClick={() => setDays(7)}>7 days</button><button className={days === 30 ? 'filter-chip selected' : 'filter-chip'} onClick={() => setDays(30)}>30 days</button><button className="icon-button" onClick={() => void load(days)} aria-label="Refresh analytics" disabled={loading}><RefreshCw size={14} /></button></div>
    </div>
    <div className="chart-summary"><strong>{loading ? '—' : total.toLocaleString()}</strong><span>records represented in the selected rolling window</span></div>
    <div className="analytics-chart">{error ? <div className="empty-state">{error}</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={data?.points || []} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}><CartesianGrid stroke="#fff" strokeOpacity=".07" vertical={false} /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: '#71808a', fontSize: 9 }} axisLine={false} tickLine={false} interval={days === 7 ? 0 : 4} /><YAxis allowDecimals={false} tick={{ fill: '#71808a', fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={(value) => String(value)} contentStyle={{ background: '#111922', border: '1px solid #38424a', borderRadius: 8, fontSize: 11 }} /><Bar dataKey="usgs" name="USGS earthquakes" stackId="a" fill="#d9b15f" /><Bar dataKey="eonet" name="NASA EONET" stackId="a" fill="#79a9a0" /></BarChart></ResponsiveContainer>}</div>
    <div className="analytics-meta">{(data?.sources || []).map(source => <span key={source.id} className={source.status === 'online' ? 'online' : 'offline'}>{source.id}: {source.status === 'online' ? source.count + ' source records' : 'unavailable'}</span>)}</div>
    {data?.categories?.length ? <div className="analytics-categories"><b>Top categories</b>{data.categories.slice(0, 5).map(item => <span key={item.name}>{item.name} <strong>{item.count}</strong></span>)}</div> : null}
    <div className="chart-note"><Activity size={13} /> {data?.note || (loading ? 'Loading source data…' : 'No analytics note available.')}</div>
  </section>
}
