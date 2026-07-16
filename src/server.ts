import Fastify from "fastify";
import { statusRoutes } from "./routes/status.js";

const app = Fastify({ logger: true });
app.register(statusRoutes);

const port = Number(process.env.PORT ?? 4000);

app.listen({ port }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
