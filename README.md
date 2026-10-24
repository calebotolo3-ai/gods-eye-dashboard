# God's Eye Dashboard

A privacy-first, public-data situational-awareness dashboard. Phase 3 connects attributed public natural-event feeds and provides optional, server-side AI-assisted summaries.

## Features

- React + TypeScript + Vite responsive black-and-gold interface
- Interactive OpenStreetMap basemap with source attribution and map layer toggles
- USGS GeoJSON earthquake feed for the past 24 hours
- Rolling 7-day and 30-day source-attributed analytics from USGS monthly and NASA EONET open-event feeds
- Daily activity chart, source health indicators, and top-category counts
- NASA EONET open natural-event records for the past 14 days
- Source status, retrieval timestamp, original-source links, search, and category filters
- Public record markers for items with point coordinates
- Optional Gemini summaries generated server-side
- Explicit labels separating source reports and AI summaries from the limitations of rolling analytics snapshots

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

The Vite development server includes local API middleware for `/api/signals` and `/api/summarize`. The same endpoints are exposed as Vercel Functions from the root `api/` directory when deployed on Vercel.

Production build:

```bash
npm run build
npm run preview
```

## Public feeds and limitations

The server aggregates two public sources: the [USGS GeoJSON earthquake feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson) and [NASA EONET open natural-event records](https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=14&limit=60). The dashboard labels each source, shows retrieval time, and links to the upstream record. Coverage, timestamps, descriptions, event geometry, and availability can vary; source records may be revised or incomplete. The application does not independently verify reports, predict impacts, or classify records as emergencies.

The map uses OpenStreetMap standard tiles with visible attribution. Tiles are requested for the viewed area rather than bulk-prefetched or downloaded for offline use. The standard tile service is best-effort and subject to its published [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Choose a dedicated provider or self-hosted tiles before expecting high production traffic.

## AI summaries (optional)

AI summaries use Gemini from a server-side endpoint. The API key is never required in or embedded into browser code.

For local development, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`. `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`. In production on Vercel, configure those values in the project's server-side Environment Variables settings and redeploy. Never commit `.env.local`, expose the key in a `VITE_*` variable, or paste keys into source files. Without a configured key, public feeds still work and summary requests show an explicit setup message.

The summary endpoint validates the source and record fields, bounds input/output size, and applies a basic per-process request limiter. Serverless memory is not a shared/global rate limiter; use platform-level rate limits and provider quota/budget controls before making the service public.

## Data privacy

The dashboard works with public natural-event records only. It does not track individuals or infer identities. AI summaries are labelled as generated text and are not independent verification or emergency guidance. The analytics view aggregates the currently available USGS monthly feed and NASA EONET open-event records. It is a rolling source snapshot, not a complete historical archive; upstream coverage, date semantics, and availability vary.

Store secrets only as server-side environment variables or hosting secrets. Never commit credentials.

## Roadmap

1. **Foundation:** dashboard UI and application scaffold.
2. **Geospatial:** interactive OpenStreetMap map and attributed public geographic context.
3. **Intelligence (current):** USGS + NASA EONET feeds and optional Gemini summaries.
4. **Analytics (implemented):** rolling 7-day and 30-day trends, source status, and category counts using attributed public feeds.
5. **Release hardening (implemented):** browser security headers, least-privilege CI permissions, scheduled CodeQL analysis, and a security/release checklist.

## Release notes

Phase 4 analytics are served by `/api/analytics?days=7` or `/api/analytics?days=30`. The endpoint is read-only and cacheable in production. Phase 5 adds baseline response headers through `vercel.json`, CodeQL scanning, and a practical release checklist in `SECURITY.md`. A successful build and security scan do not replace a deployment review or external penetration test.


## Phase 6 — live situational awareness

The dashboard now adds a dedicated intelligence API and panels for:

- **Road traffic:** sampled live road-segment speeds for selected Nairobi corridors through the TomTom Traffic Flow API. This is not a complete citywide traffic census. Configure `TOMTOM_API_KEY` as a server-side environment variable in Vercel to enable it. Without the key, the dashboard clearly shows setup-required status instead of invented traffic values.
- **Weather:** current conditions and a five-day forecast for Nairobi from Open-Meteo.
- **Global alerts:** red and orange public disaster alerts from GDACS, with source links.
- **Reports:** export the currently loaded traffic, weather and alert snapshot as a CSV file.

### Enable live road traffic on Vercel

1. Create an API key in your TomTom developer account and check the provider's current plan, coverage, quota and terms.
2. Open the Vercel project settings for `gods-eye-dashboard1`.
3. Add `TOMTOM_API_KEY` under Environment Variables for Production (and Preview if needed).
4. Redeploy the project.

The key is read only by the server-side API. Do not add it to browser code or commit it to GitHub. Traffic samples are limited to the named Nairobi road points in `server/intelligence.ts`; add more validated road points only after checking provider coverage. Weather and GDACS feeds are independently available and do not require the TomTom key.

All feeds are informational and may be delayed, incomplete or unavailable. This dashboard is not an emergency service or a substitute for official traffic, weather or public-safety instructions.

### Global traffic sampling update

The Phase 6 traffic service samples 18 named road points across Nairobi, London, New York, Singapore, São Paulo, Tokyo, Sydney and Dubai through TomTom Traffic Flow. The dashboard refreshes this snapshot every two minutes and displays observed speeds, free-flow speeds, congestion bands, provider confidence and road-closure flags where returned. This is a representative set of monitored corridors, not live coverage of every road or every country. Some samples may be unavailable due to provider coverage, quota or connectivity. The weather panel remains Nairobi-focused. GDACS alerts are hazard/disaster reports and must not be interpreted as a comprehensive road-accident feed.
