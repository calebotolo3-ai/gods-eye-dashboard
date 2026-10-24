import { useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Check, ChevronDown,
  Clock3, Compass, Crosshair, Globe2, Layers3, Menu, MoreHorizontal,
  Radio, RefreshCw, Search, ShieldCheck, Signal, SlidersHorizontal,
  Sparkles, Wifi, X
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

type EventItem = {
  id: number
  category: 'Environment' | 'Infrastructure' | 'Public update'
  title: string
  detail: string
  location: string
  time: string
  level: 'Watch' | 'Info' | 'Elevated'
}

const initialEvents: EventItem[] = [
  { id: 1, category: 'Environment', title: 'Regional weather watch', detail: 'Sample feed item · awaiting live source connection', location: 'East Africa', time: '4 min ago', level: 'Watch' },
  { id: 2, category: 'Infrastructure', title: 'Transport network status', detail: 'Sample feed item · public status placeholder', location: 'Nairobi region', time: '18 min ago', level: 'Info' },
  { id: 3, category: 'Public update', title: 'Public information bulletin', detail: 'Sample feed item · source verification pending', location: 'Global', time: '32 min ago', level: 'Info' },
  { id: 4, category: 'Environment', title: 'Earth observation update', detail: 'Sample feed item · demonstration data only', location: 'Indian Ocean', time: '51 min ago', level: 'Watch' },
]

const activityData = [
  { time: '00:00', activity: 18 }, { time: '04:00', activity: 24 },
  { time: '08:00', activity: 21 }, { time: '12:00', activity: 39 },
  { time: '16:00', activity: 31 }, { time: '20:00', activity: 48 },
  { time: '23:59', activity: 35 },
]

const filters = ['All', 'Environment', 'Infrastructure', 'Public update'] as const

function GlobeVisual() {
  return (
    <div className="globe-stage" aria-label="Illustrative globe placeholder. Live map data is not connected.">
      <div className="globe-grid" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="globe">
        <div className="globe-shine" />
        <svg viewBox="0 0 420 420" role="img" aria-label="Stylised world map illustration">
          <defs>
            <clipPath id="sphere"><circle cx="210" cy="210" r="174" /></clipPath>
            <radialGradient id="ocean" cx="35%" cy="28%"><stop offset="0%" stopColor="#1b2d38"/><stop offset="100%" stopColor="#09151d"/></radialGradient>
          </defs>
          <circle cx="210" cy="210" r="174" fill="url(#ocean)" stroke="#d6ad58" strokeOpacity=".65" strokeWidth="1.4" />
          <g clipPath="url(#sphere)" fill="#b58c43" fillOpacity=".48" stroke="#e5c477" strokeOpacity=".3" strokeWidth="1">
            <path d="M69 117l28-31 34-7 20 15 32 2 13 21-12 19-28 8-12 22-25 4-9 28-20 3-12-26-20-13-12-26z"/>
            <path d="M169 210l25 5 18 28-6 37-17 35-15 41-17-16-4-37-14-32 9-35z"/>
            <path d="M219 94l30-15 38 8 17 18 39 4 24 24-8 23-34 2-18 20-30-8-18 19-22-15-25-5-14-29 13-19z"/>
            <path d="M274 214l35-8 32 18 13 37-18 31-30 9-22-19-20-35z"/>
            <path d="M72 273l29-13 31 12 10 27-19 21-38-4-23-18z"/>
          </g>
          <g stroke="#d6ad58" strokeOpacity=".18" fill="none">
            <ellipse cx="210" cy="210" rx="82" ry="174"/><ellipse cx="210" cy="210" rx="139" ry="174"/>
            <path d="M38 210h344M55 145h310M55 275h310"/>
          </g>
          <g fill="#f4c86a" stroke="#f4c86a">
            <circle cx="234" cy="213" r="4"/><circle cx="234" cy="213" r="10" fill="none" strokeOpacity=".65"/>
            <circle cx="145" cy="153" r="3"/><circle cx="145" cy="153" r="8" fill="none" strokeOpacity=".45"/>
            <circle cx="291" cy="275" r="3"/><circle cx="291" cy="275" r="8" fill="none" strokeOpacity=".45"/>
          </g>
        </svg>
      </div>
      <div className="map-label label-east">EAST AFRICA <span>DEMO MARKER</span></div>
      <div className="map-label label-north">GLOBAL VIEW <span>ILLUSTRATIVE</span></div>
      <div className="map-coordinates">01°17′S&nbsp; 36°49′E</div>
      <div className="map-legend"><span className="legend-dot" /> DEMO MARKERS <span className="legend-line" /> ORBIT PATH</div>
      <div className="globe-corner"><Crosshair size={15} /> MAP ENGINE NOT CONNECTED</div>
    </div>
  )
}

function App() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState(initialEvents)
  const [refreshed, setRefreshed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const visibleEvents = useMemo(() => events.filter((event) => {
    const matchesFilter = filter === 'All' || event.category === filter
    const matchesQuery = `${event.title} ${event.detail} ${event.location}`.toLowerCase().includes(query.toLowerCase())
    return matchesFilter && matchesQuery
  }), [events, filter, query])

  const refreshDemo = () => {
    setEvents([...initialEvents].reverse())
    setRefreshed(true)
    window.setTimeout(() => setRefreshed(false), 1800)
  }

  const navItems = [
    { label: 'Overview', icon: Layers3 },
    { label: 'Global map', icon: Globe2 },
    { label: 'Signals', icon: Radio },
    { label: 'Analytics', icon: Activity },
  ]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Crosshair size={22} strokeWidth={1.6}/></div>
          <div><strong>GOD'S EYE</strong><span>OPEN INTELLIGENCE</span></div>
          <button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); setMenuOpen(false) }}>
              <Icon size={17}/><span>{label}</span>{label === 'Signals' && <i className="nav-count">4</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider"/>
        <div className="workspace-label">SYSTEM</div>
        <button className="nav-item" onClick={() => setActiveNav('Sources')}><Wifi size={17}/><span>Data sources</span><span className="status-mini"/></button>
        <button className="nav-item" onClick={() => setActiveNav('Settings')}><SlidersHorizontal size={17}/><span>Settings</span></button>
        <div className="sidebar-bottom">
          <div className="secure-card"><ShieldCheck size={17}/><div><b>Privacy first</b><span>Public & aggregate data only</span></div></div>
          <div className="profile-row"><div className="avatar">GE</div><div><b>Analyst workspace</b><span>Local demo environment</span></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={19}/></button>
            <div className="breadcrumb">Workspace <span>/</span> <b>{activeNav}</b></div>
          </div>
          <div className="topbar-actions">
            <div className="system-status"><span className="pulse-dot"/> ALL SYSTEMS NOMINAL <span className="status-divider"/> DEMO MODE</div>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button>
            <button className="user-chip"><span className="avatar small">GE</span><ChevronDown size={14}/></button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="page-heading">
            <div><div className="eyebrow"><span/> SITUATIONAL AWARENESS PLATFORM</div><h1>{activeNav === 'Overview' ? 'Intelligence overview' : activeNav}</h1><p>Your unified view of public information signals around the world.</p></div>
            <div className="heading-actions"><span className="date-chip"><Clock3 size={14}/> LIVE CLOCK · LOCAL</span><button className="primary-button" onClick={refreshDemo}><RefreshCw size={15} className={refreshed ? 'spin' : ''}/>{refreshed ? 'Refreshed' : 'Refresh demo'}</button></div>
          </section>

          <section className="metric-grid" aria-label="Overview metrics">
            <article className="metric-card"><div className="metric-top"><span>TRACKED SIGNALS</span><div className="metric-icon"><Signal size={17}/></div></div><div className="metric-value">04 <span className="metric-change neutral"><Activity size={13}/> DEMO</span></div><div className="metric-foot">Illustrative feed items</div></article>
            <article className="metric-card"><div className="metric-top"><span>REGIONS IN VIEW</span><div className="metric-icon"><Globe2 size={17}/></div></div><div className="metric-value">03 <span className="metric-change positive"><ArrowUpRight size={13}/> SAMPLE</span></div><div className="metric-foot">Example geographic coverage</div></article>
            <article className="metric-card"><div className="metric-top"><span>WATCH ITEMS</span><div className="metric-icon"><Compass size={17}/></div></div><div className="metric-value">02 <span className="metric-change neutral">DEMO</span></div><div className="metric-foot">No live alerts are active</div></article>
            <article className="metric-card"><div className="metric-top"><span>DATA CONNECTIONS</span><div className="metric-icon"><Wifi size={17}/></div></div><div className="metric-value">00 <span className="metric-change neutral">OFFLINE</span></div><div className="metric-foot">Connect trusted public sources</div></article>
          </section>

          <section className="content-grid">
            <article className="panel map-panel">
              <div className="panel-header"><div><div className="panel-kicker">GEOSPATIAL OVERVIEW</div><h2>Global activity map</h2></div><button className="subtle-button"><Globe2 size={14}/> World view <ChevronDown size={13}/></button></div>
              <GlobeVisual/>
              <div className="map-footer"><span><i className="tiny-dot"/> Visual concept preview</span><span>CESIUM MAP INTEGRATION · PHASE 2</span></div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-header"><div><div className="panel-kicker">SIGNAL DISTRIBUTION</div><h2>Activity trend</h2></div><button className="period-button">24 hours <ChevronDown size={13}/></button></div>
              <div className="chart-summary"><strong>—</strong><span>Awaiting connected data</span></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activityData} margin={{top:8,right:4,left:-24,bottom:0}}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d8ae5a" stopOpacity={0.28}/><stop offset="95%" stopColor="#d8ae5a" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff" strokeOpacity={0.07} vertical={false}/><XAxis dataKey="time" tick={{fill:'#71808a',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#71808a',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#111922',border:'1px solid #38424a',borderRadius:8,fontSize:12}}/><Area type="monotone" dataKey="activity" stroke="#d8ae5a" strokeWidth={2} fill="url(#activityFill)" /></AreaChart></ResponsiveContainer></div>
              <div className="chart-note"><span className="legend-line"/> <span>Illustrative sample series · not live measurements</span></div>
            </article>
          </section>

          <section className="panel feed-panel">
            <div className="panel-header feed-header"><div><div className="panel-kicker">PUBLIC INFORMATION STREAM</div><h2>Recent signals <span className="count-pill">{visibleEvents.length}</span></h2></div><div className="feed-tools"><div className="search-box"><Search size={15}/><input aria-label="Search signals" placeholder="Search signals..." value={query} onChange={(e) => setQuery(e.target.value)}/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={13}/></button>}</div><button className="icon-button filter-button" aria-label="Filter signals"><SlidersHorizontal size={16}/></button></div></div>
            <div className="filter-row">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'filter-chip selected' : 'filter-chip'}>{item}</button>)}</div>
            <div className="event-list">
              {visibleEvents.length ? visibleEvents.map((event) => <div className="event-row" key={event.id}><div className={`event-symbol ${event.category === 'Environment' ? 'env' : event.category === 'Infrastructure' ? 'infra' : 'public'}`}>{event.category === 'Environment' ? <Activity size={16}/> : event.category === 'Infrastructure' ? <Signal size={16}/> : <Sparkles size={16}/>}</div><div className="event-main"><div className="event-title">{event.title}<span className={`level-tag ${event.level.toLowerCase()}`}>{event.level}</span></div><div className="event-detail">{event.detail}</div></div><div className="event-location">{event.location}</div><div className="event-time">{event.time}</div><button className="icon-button event-more" aria-label={`More about ${event.title}`}><MoreHorizontal size={17}/></button></div>) : <div className="empty-state">No sample signals match that search.</div>}
            </div>
            <div className="feed-disclaimer"><ShieldCheck size={14}/> Demo content only. No real-world incident reports or live feeds are connected.</div>
          </section>

          <footer className="page-footer"><span>GOD'S EYE <i/> PHASE 1 FOUNDATION</span><span>BUILT FOR TRANSPARENCY · PUBLIC DATA ONLY</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App