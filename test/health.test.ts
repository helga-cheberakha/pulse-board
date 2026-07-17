import { describe, it, expect } from "vitest";
import { getHealth } from "../src/health-service.js";
import { buildApp } from "../src/app.js";

describe("health-service unit", () => {
  it("returns { status: 'ok' } synchronously", () => {
    const result = getHealth();
    expect(result).toEqual({ status: "ok" });
  });
});

describe("GET /health integration", () => {
  it("returns 200 with { status: 'ok' } and content-type application/json", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("two sequential requests return byte-identical status and body", async () => {
    const app = buildApp();
    const res1 = await app.inject({ method: "GET", url: "/health" });
    const res2 = await app.inject({ method: "GET", url: "/health" });
    expect(res1.statusCode).toBe(res2.statusCode);
    expect(res1.body).toBe(res2.body);
  });
});
