# pulse-board — agent guide

Minimal Fastify status service: one page, one JSON endpoint, no database.

## Conventions
- All business logic lives in `*-service.ts` files (e.g. `status-service.ts`).
  Route handlers only read from a service and shape the response — never
  compute status data inline in a route file.
- No persistence layer. This service is stateless by design; don't add a
  database or file-based storage without discussing it first.
- Shared shapes go in `src/types.ts`, imported by both the service and the
  route that uses them.
- ESM throughout — relative imports carry the `.js` extension even though
  the source files are `.ts`.

## Commands
- `npm run dev` — start the server with hot reload (tsx watch).
- `npm test` — run the vitest suite. Must pass before any commit.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run build` — compile to `dist/`.

## Do-not-touch
- None yet — this is a small, single-purpose service.
