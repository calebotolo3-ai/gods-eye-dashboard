# God's Eye Dashboard

A privacy-first, public-data situational awareness dashboard. Phase 1 establishes the responsive interface and application foundation.

## Phase 1
- React + TypeScript + Vite scaffold
- Responsive black-and-gold dashboard
- Overview metrics and navigation shell
- Illustrative globe placeholder for a future map engine
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
This phase does not connect to live feeds, track people, or report real incidents. All feed entries, metrics, chart values, and map markers are illustrative demo content. Phase 2 can add a real map engine and carefully selected, documented public data sources.

Store API keys only as server-side environment variables or hosting secrets. Never commit credentials.

## Roadmap
1. **Foundation (current):** dashboard UI and application scaffold.
2. **Geospatial:** interactive map with attributed public geographic layers.
3. **Intelligence:** trusted public feeds and AI-assisted summaries.
4. **Analytics:** historical trends, filters, configurable panels.
5. **Release:** tests, security review, deployment.