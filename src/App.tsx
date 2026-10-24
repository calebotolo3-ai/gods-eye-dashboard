import { useEffect, useMemo, useState } from 'react'
import { Activity, Bell, ChevronDown, Clock3, Crosshair, ExternalLink, Globe2, Layers3, Menu, MoreHorizontal, Radio, RefreshCw, Search, ShieldCheck, Signal, SlidersHorizontal, Sparkles, Wifi, X } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import InteractiveMap, { type MapSignal } from './components/InteractiveMap'

type SignalItem = MapSignal
type SourceStatus = { id: 'USGS' | 'NASA EONET'; label: string; status: 'online' | 'offline'; count: number; checkedAt: string; note?: string }
type SummaryState = { status: 'loading' | 'ready' | 'error'; text?: string; error?: string }
type FeedResponse = { signals: SignalItem[]; sources: SourceStatus[]; fetchedAt: string }

const trend = [{ t: '00:00', v: 18 }, { t: '04:00', v: 24 }, { t: '08:00', v: 21 }, { t: '12:00', v: 39 }, { t: '16:00', v: 31 }, { t: '20:00', v: 48 }, { t: '23:59', v: 35 }]

function formatTimestamp(value: string | null) {
  if (!value) return 'Waiting for source feeds'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Timestamp unavailable' : date.toLocaleString()
}

function App() {
  const [nav, setNav] = useState('Overview')
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<SignalItem[]>([])
  const [sources, setSources] = useState<SourceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [summaries, setSummaries] = useState<Record<string, SummaryState>>({})
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)

  async function loadSignals(manual = false) {
    if (manual) setRefreshing(true)
    setLoading(true)
    setFeedError('')
    try {
      const response = await fetch('/api/signals', { headers: { accept: 'application/json' } })
      const payload = await response.json() as FeedResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Could not retrieve the public feeds.')
      setEvents(Array.isArray(payload.signals) ? payload.signals : [])
      setSources(Array.isArray(payload.sources) ? payload.sources : [])
      setLastFetched(payload.fetchedAt || new Date().toISOString())
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : 'Could not retrieve the public feeds.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void loadSignals() }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(events.map((event) => event.category))).slice(0, 6)],
    [events]
  )
  const visible = useMemo(() => events.filter((event) => {
    const matchesFilter = filter === 'All' || event.category === filter
    const haystack = `${event.title} ${event.detail} ${event.location} ${event.sourceLabel} ${event.category}`.toLowerCase()
    return matchesFilter && haystack.includes(query.toLowerCase())
  }), [events, filter, query])
  const onlineSources = sources.filter((source) => source.status === 'online').length
  const earthquakeCount = events.filter((event) => event.source === 'USGS').length
  const eventTypeCount = new Set(events.map((event) => event.category)).size
  const feedStatus = loading ? 'CONNECTING PUBLIC FEEDS'
    : sources.length > 0 && onlineSources === sources.length ? 'PUBLIC FEEDS CONNECTED'
      : onlineSources > 0 ? 'PARTIAL FEED STATUS'
        : 'FEEDS UNAVAILABLE'

  async function summarize(event: SignalItem) {
    const existing = summaries[event.id]
    if (existing?.status === 'ready') {
      setExpandedSummary((current) => current === event.id ? null : event.id)
      return
    }
    setSummaries((current) => ({ ...current, [event.id]: { status: 'loading' } }))
    setExpandedSummary(event.id)
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          signal: {
            source: event.source,
            title: event.title,
            category: event.category,
            detail: event.detail,
            location: event.location,
            occurredAt: event.occurredAt
          }
        })
      })
      const result = await response.json() as { summary?: string; error?: string }
      if (!response.ok) throw new Error(result.error || 'The summary request did not complete.')
      if (!result.summary) throw new Error('The AI service returned no summary.')
      setSummaries((current) => ({ ...current, [event.id]: { status: 'ready', text: result.summary } }))
    } catch (error) {
      setSummaries((current) => ({
        ...current,
        [event.id]: { status: 'error', error: error instanceof Error ? error.message : 'Summary unavailable.' }
      }))
    }
  }

  const navItems = [['Overview', Layers3], ['Global map', Globe2], ['Signals', Radio], ['Analytics', Activity]] as const

  return <div className="app-shell">
    <aside className={`sidebar ${menu ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Crosshair size={22} /></div><div><strong>GOD'S EYE</strong><span>OPEN INTELLIGENCE</span></div><button className="mobile-close icon-button" onClick={() => setMenu(false)} aria-label="Close menu"><X /></button></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{navItems.map(([label, Icon]) => <button key={label} className={`nav-item ${nav === label ? 'active' : ''}`} onClick={() => { setNav(label); setMenu(false) }}><Icon size={17} />{label}{label === 'Signals' && <i className="nav-count">{events.length}</i>}</button>)}</nav>
      <div className="side-divider" /><div className="side-label">SYSTEM</div>
      <button className={`nav-item ${nav === 'Data sources' ? 'active' : ''}`} onClick={() => setNav('Data sources')}><Wifi size={17} />Data sources<span className={`status-mini ${onlineSources ? '' : 'offline'}`} /></button>
      <button className={`nav-item ${nav === 'Settings' ? 'active' : ''}`} onClick={() => setNav('Settings')}><SlidersHorizontal size={17} />Settings</button>
      <div className="sidebar-bottom"><div className="secure-card"><ShieldCheck size={17} /><div><b>Privacy first</b><span>Public event data only</span></div></div><div className="profile-row"><div className="avatar">GE</div><div><b>Analyst workspace</b><span>Public-feed mode</span></div><MoreHorizontal size={17} /></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button><div className="breadcrumb">Workspace <span>/</span> <b>{nav}</b></div></div>
        <div className="topbar-actions"><div className={`system-status ${onlineSources ? 'connected' : 'disconnected'}`}><i />{feedStatus}<span className="status-divider" />PHASE 3</div><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /></button><div className="avatar small">GE</div></div>
      </header>

      <div className="page-wrap">
        <section className="page-heading"><div><div className="eyebrow"><i /> PUBLIC INFORMATION · SOURCE ATTRIBUTION</div><h1>{nav === 'Overview' ? 'Intelligence overview' : nav}</h1><p>Explore public natural-event records with links to their original source reports.</p></div>
          <div className="heading-actions"><span className="date-chip"><Clock3 size={14} /> {lastFetched ? `UPDATED ${new Date(lastFetched).toLocaleTimeString()}` : 'FEED TIME UNAVAILABLE'}</span><button className="primary-button" onClick={() => void loadSignals(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'spin' : ''} />{refreshing ? 'Refreshing…' : 'Refresh feeds'}</button></div>
        </section>

        <section className="metric-grid" aria-label="Public feed metrics">
          <article className="metric-card"><div className="metric-top">PUBLIC FEED ITEMS<span><Signal size={16} /></span></div><div className="metric-value">{String(events.length).padStart(2, '0')} <small>{loading ? 'LOADING' : 'RETRIEVED'}</small></div><div className="metric-foot">Records returned by connected sources</div></article>
          <article className="metric-card"><div className="metric-top">SOURCES ONLINE<span><Wifi size={16} /></span></div><div className="metric-value">{String(onlineSources).padStart(2, '0')} <small className={onlineSources ? 'green' : ''}>OF {String(sources.length || 2).padStart(2, '0')}</small></div><div className="metric-foot">USGS and NASA EONET feed status</div></article>
          <article className="metric-card"><div className="metric-top">EARTHQUAKE REPORTS<span><Activity size={16} /></span></div><div className="metric-value">{String(earthquakeCount).padStart(2, '0')} <small>USGS</small></div><div className="metric-foot">Past-24-hour public feed</div></article>
          <article className="metric-card"><div className="metric-top">EVENT CATEGORIES<span><Globe2 size={16} /></span></div><div className="metric-value">{String(eventTypeCount).padStart(2, '0')} <small>OBSERVED</small></div><div className="metric-foot">Categories represented in retrieved records</div></article>
        </section>

        <section className="content-grid">
          <article className="panel"><div className="panel-head"><div><div className="panel-kicker">INTERACTIVE GEOSPATIAL VIEW</div><h2>Public event locations</h2></div><span className="map-live-tag"><i /> SOURCE-REPORTED POINTS</span></div><InteractiveMap events={events} /><div className="map-footer"><span><i /> Public records with usable coordinates</span><span>OPENSTREETMAP BASEMAP</span></div></article>
          <article className="panel activity-panel"><div className="panel-head"><div><div className="panel-kicker">ANALYTICS PREVIEW</div><h2>Activity trend</h2></div><span className="subtle-note">SAMPLE ONLY</span></div><div className="chart-summary"><strong>—</strong><span>Historical series not connected</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d8ae5a" stopOpacity=".28" /><stop offset="95%" stopColor="#d8ae5a" stopOpacity="0" /></linearGradient></defs><CartesianGrid stroke="#fff" strokeOpacity=".07" vertical={false} /><XAxis dataKey="t" tick={{ fill: '#71808a', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#71808a', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#111922', border: '1px solid #38424a', borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="v" stroke="#d8ae5a" strokeWidth={2} fill="url(#fill)" /></AreaChart></ResponsiveContainer></div><div className="chart-note"><i /> Displayed chart values are illustrative, not measurements from these feeds.</div></article>
        </section>

        <section className="panel feed-panel">
          <div className="feed-head"><div><div className="panel-kicker">ATTRIBUTED PUBLIC INFORMATION</div><h2>Recent source records <span className="count-pill">{visible.length}</span></h2></div><div className="feed-tools"><div className="search-box"><Search size={14} /><input aria-label="Search source records" placeholder="Search records…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button>}</div><button className="icon-button filter-button" aria-label="Search filters"><SlidersHorizontal size={16} /></button></div></div>
          <div className="source-status-row">{sources.map((source) => <span key={source.id} className={`source-status ${source.status}`}><i />{source.label}: {source.status === 'online' ? `${source.count} records` : 'unavailable'}</span>)}{lastFetched && <span className="feed-checked">Checked {formatTimestamp(lastFetched)}</span>}</div>
          <div className="filter-row">{categories.map((category) => <button key={category} onClick={() => setFilter(category)} className={filter === category ? 'filter-chip selected' : 'filter-chip'}>{category}</button>)}</div>
          <div className="event-list">
            {visible.length ? visible.map((event) => {
              const summary = summaries[event.id]
              const expanded = expandedSummary === event.id
              return <div className="event-row-wrap" key={event.id}>
                <div className="event-row">
                  <div className={`event-symbol ${event.source === 'USGS' ? 'env' : 'public'}`}>{event.source === 'USGS' ? <Activity size={16} /> : <Globe2 size={16} />}</div>
                  <div className="event-main"><div className="event-title">{event.title}<span className="level-tag info">{event.category}</span></div><div className="event-detail">{event.detail}</div><div className="event-meta">{event.sourceLabel} · {formatTimestamp(event.occurredAt)}</div></div>
                  <div className="event-location">{event.location}</div>
                  <a className="source-link" href={event.url} target="_blank" rel="noreferrer" aria-label={`Open original source for ${event.title}`}><ExternalLink size={14} /></a>
                  <button className={`summary-action ${summary?.status === 'ready' ? 'ready' : ''}`} onClick={() => void summarize(event)} disabled={summary?.status === 'loading'} aria-expanded={expanded} aria-label={`Summarize ${event.title}`}>{summary?.status === 'loading' ? <RefreshCw size={13} className="spin" /> : <Sparkles size={13} />}{summary?.status === 'loading' ? 'Working…' : summary?.status === 'ready' ? (expanded ? 'Hide summary' : 'Show summary') : summary?.status === 'error' ? 'Retry summary' : 'Summarize'}</button>
                </div>
                {expanded && summary?.status === 'loading' && <div className="summary-panel"><span className="summary-heading"><Sparkles size={13} /> AI-ASSISTED SUMMARY</span><p>Generating a concise summary from the selected public source record…</p></div>}
                {expanded && summary?.status === 'ready' && <div className="summary-panel"><span className="summary-heading"><Sparkles size={13} /> AI-ASSISTED SUMMARY</span><p>{summary.text}</p><div className="summary-disclaimer">AI-generated from the source record; not independent verification or emergency guidance.</div></div>}
                {expanded && summary?.status === 'error' && <div className="summary-panel summary-error"><span className="summary-heading"><Sparkles size={13} /> SUMMARY UNAVAILABLE</span><p>{summary.error}</p></div>}
              </div>
            }) : <div className="empty-state">{loading ? 'Connecting to USGS and NASA EONET public feeds…' : feedError ? feedError : sources.length && onlineSources === 0 ? 'Both public sources are currently unavailable. Refresh to retry.' : 'No records match the current search or category filter.'}</div>}
          </div>
          <div className="feed-disclaimer"><ShieldCheck size={14} /> Source records may change upstream. This dashboard does not independently verify reports or classify them as emergencies. AI summaries require a server-side Gemini configuration.</div>
        </section>

        <footer className="page-footer"><span>GOD'S EYE <i /> PHASE 3 · PUBLIC FEEDS + AI</span><span>ATTRIBUTION · SOURCE LINKS · PRIVACY FIRST</span></footer>
      </div>
    </main>
  </div>
}

export default App
