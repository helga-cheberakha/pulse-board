import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { statusRoutes } from "./routes/status.js";
import { healthRoutes } from "./routes/health.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "public"),
  });
  app.register(statusRoutes);
  app.register(healthRoutes);

  return app;
}
