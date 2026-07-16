import { describe, it, expect } from "vitest";
import { getStatus } from "../src/status-service.js";

describe("status-service", () => {
  it("returns a snapshot with a non-negative uptime", () => {
    const s = getStatus();
    expect(s.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("returns a version string", () => {
    const s = getStatus();
    expect(s.version).toBeTypeOf("string");
  });

  it("returns an ISO timestamp for lastCheckedAt", () => {
    const s = getStatus();
    expect(() => new Date(s.lastCheckedAt).toISOString()).not.toThrow();
  });
});
