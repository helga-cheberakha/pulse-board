# pulse-board

A minimal Fastify status service. Serves one HTML page and one JSON endpoint
reporting version, uptime, and the last-checked timestamp.

## Prerequisites

- Node.js 22+
- npm 10+

## Install

```bash
git clone <this-repo-url>
cd pulse-board
npm install
```

## Run in development

```bash
npm run dev
```

This starts the server with hot reload (`tsx watch`) on **http://localhost:4000**.

- HTML status page: http://localhost:4000
- JSON status endpoint: http://localhost:4000/status.json

Open it in a browser:

```bash
open http://localhost:4000
```

Stop the server with `Ctrl+C` (or, if it was started in the background,
`pkill -f "tsx src/server.ts"` / `pkill -f "tsx watch src/server.ts"`).

### Changing the port

The port defaults to **4000** (chosen so it doesn't collide with DevDigest's
client, which runs on 3000) and can be overridden with the `PORT` env var:

```bash
PORT=5050 npm run dev
```

## Run in production

```bash
npm run build   # compiles TypeScript to dist/
npm start       # runs the compiled server
```

## Test

```bash
npm test         # run the vitest suite
npm run typecheck  # tsc --noEmit
```

## Troubleshooting

- **"Port already in use"** — another process (possibly a previous
  `pulse-board` run, or DevDigest's client on 3000) is bound to the port.
  Either stop it or run with a different `PORT` (see above).
- **`npm run dev` exits immediately with no error** — check that
  `npm install` completed successfully and `node_modules/` exists.
