import type { FastifyInstance } from "fastify";
import { getStatus } from "../status-service.js";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/", async (_req, reply) => {
    const s = getStatus();
    reply.type("text/html").send(`
      <html>
        <body>
          <h1>pulse-board</h1>
          <p>version: ${s.version}</p>
          <p>uptime: ${s.uptimeSeconds}s</p>
          <p>last checked: ${s.lastCheckedAt}</p>
        </body>
      </html>
    `);
  });

  app.get("/status.json", async () => getStatus());
}
