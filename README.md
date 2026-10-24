# God's Eye Dashboard

A privacy-first, public-data situational-awareness dashboard. Phase 3 connects attributed public natural-event feeds and provides optional, server-side AI-assisted summaries.

## Features

- React + TypeScript + Vite responsive black-and-gold interface
- Interactive OpenStreetMap basemap with source attribution and map layer toggles
- USGS GeoJSON earthquake feed for the past 24 hours
- NASA EONET open natural-event records for the past 14 days
- Source status, retrieval timestamp, original-source links, search, and category filters
- Public record markers for items with point coordinates
- Optional Gemini summaries generated server-side
- Explicit labels separating source reports, AI summaries, and illustrative chart data

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

For local development, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`. In production on Vercel, configure those values in the project's server-side Environment Variables settings and redeploy. Never commit `.env.local`, expose the key in a `VITE_*` variable, or paste keys into source files. Without a configured key, public feeds still work and summary requests show an explicit setup message.

The summary endpoint validates the source and record fields, bounds input/output size, and applies a basic per-process request limiter. Serverless memory is not a shared/global rate limiter; use platform-level rate limits and provider quota/budget controls before making the service public.

## Data privacy

The dashboard works with public natural-event records only. It does not track individuals or infer identities. AI summaries are labelled as generated text and are not independent verification or emergency guidance. The activity trend chart remains clearly labelled as illustrative sample data until a historical series is implemented.

Store secrets only as server-side environment variables or hosting secrets. Never commit credentials.

## Roadmap

1. **Foundation:** dashboard UI and application scaffold.
2. **Geospatial:** interactive OpenStreetMap map and attributed public geographic context.
3. **Intelligence (current):** USGS + NASA EONET feeds and optional Gemini summaries.
4. **Analytics:** connect historical panels to real, source-attributed data series.
5. **Release:** automated build checks, security review, and deployment.
