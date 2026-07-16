# pulse-board

A minimal Fastify status service. Serves one HTML page and one JSON endpoint
reporting version, uptime, and the last-checked timestamp.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:4000 (HTML) or http://localhost:4000/status.json (JSON).

Port defaults to 4000 (set `PORT` to override) so it doesn't collide with
DevDigest's client, which runs on 3000.

## Test

```bash
npm test
```
