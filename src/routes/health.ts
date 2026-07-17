import type { FastifyInstance } from "fastify";
import { getHealth } from "../health-service.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => getHealth());
}
