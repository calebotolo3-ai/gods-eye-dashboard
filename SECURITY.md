# Security policy

## Scope and data handling
God's Eye Dashboard displays public natural-event records from USGS and NASA EONET. It is not an emergency alerting service, does not identify or track individuals, and does not independently verify source reports.

## Secret handling
- Keep `GEMINI_API_KEY` in server-side environment variables only.
- Never use a `VITE_*` prefix for secrets or commit real credentials.
- Rotate a key immediately if it is exposed; review provider usage and quotas.
- The dashboard must remain usable for public feeds when Gemini is not configured.

## Application controls
- API routes enforce HTTP methods and bound summary request size and input fields.
- External source URLs are constrained to HTTPS before display.
- Responses use safe content-type handling; production responses add browser security headers.
- The summary limiter is per process and is not a global abuse-control system. Configure platform-level rate limits and provider quotas before public launch.

## Release checklist
- [ ] Review dependency alerts and run the production build.
- [ ] Confirm no secrets are present in commits, build output, or browser bundles.
- [ ] Configure Gemini only in server-side deployment settings.
- [ ] Verify API method handling, source attribution, and failure states.
- [ ] Confirm deployment environment variables and redeploy after secret changes.
- [ ] Test the deployed site on mobile and desktop.
- [ ] Keep the dashboard labelled as informational, not emergency guidance.

## Reporting
For a suspected vulnerability, contact the repository owner privately through GitHub rather than publishing exploit details in an issue.
