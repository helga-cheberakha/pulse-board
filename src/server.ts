import { buildApp } from "./app.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 4000);

app.listen({ port }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
