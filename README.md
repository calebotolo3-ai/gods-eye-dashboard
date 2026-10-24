# God's Eye Dashboard

A privacy-first, public-data situational awareness dashboard. Phase 1 establishes the responsive interface and application foundation.

## Phase 1
- React + TypeScript + Vite scaffold
- Responsive black-and-gold dashboard
- Overview metrics and navigation shell
- Interactive Leaflet world map with zoom, pan, scale control, map-layer toggle, and visible OpenStreetMap attribution
- Clearly labelled illustrative reference-city markers (not event reports)
- Sample public-information feed with search and category filters
- Illustrative activity chart
- Clear demo-mode labels and privacy-first positioning

## Run locally
Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Data and privacy
This dashboard does not track people or report live incidents. The basemap is supplied by OpenStreetMap; the sample markers, feed entries, metrics, and chart values are illustrative demo content and do not indicate real events. Map attribution is shown on the map. The public OpenStreetMap standard tile service is best-effort and subject to its tile usage policy; the browser requests tiles for the map area the user views, and the app does not prefetch tiles or offer offline downloads. A higher-traffic production release should choose a dedicated tile provider or self-hosted map tiles after reviewing usage limits and attribution requirements.

Store API keys only as server-side environment variables or hosting secrets. Never commit credentials.

## Roadmap
1. **Foundation (current):** dashboard UI and application scaffold.
2. **Geospatial (current):** interactive OpenStreetMap basemap with attributed public geographic context.
3. **Intelligence (next):** trusted public feeds and AI-assisted summaries.
4. **Analytics:** historical trends, filters, configurable panels.
5. **Release:** tests, security review, deployment.