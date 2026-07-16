import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";

describe("pulse-board app", () => {
  it("serves the status page at /", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("serves JSON status at /status.json", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/status.json" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("version");
  });
});
