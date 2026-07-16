# pulse-board

A minimal Fastify status service. Serves one HTML page and one JSON endpoint
reporting version, uptime, and the last-checked timestamp.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:3000 (HTML) or http://localhost:3000/status.json (JSON).

## Test

```bash
npm test
```
