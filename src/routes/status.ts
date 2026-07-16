import type { FastifyInstance } from "fastify";
import { getStatus } from "../status-service.js";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/status.json", async () => getStatus());
}
