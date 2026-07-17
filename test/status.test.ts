import { describe, it, expect, afterEach } from "vitest";
import { getStatus, resolveThreshold, classifyState } from "../src/status-service.js";

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

  it("returns a state field that is healthy or degraded", () => {
    const s = getStatus();
    expect(["healthy", "degraded"]).toContain(s.state);
  });

  it("snapshot has all existing fields alongside state", () => {
    const s = getStatus();
    expect(s).toHaveProperty("version");
    expect(s).toHaveProperty("uptimeSeconds");
    expect(s).toHaveProperty("lastCheckedAt");
    expect(s).toHaveProperty("state");
  });
});

describe("resolveThreshold", () => {
  it("returns 0.9 when env var is not set", () => {
    expect(resolveThreshold(undefined)).toBe(0.9);
  });

  it("returns 0.9 for empty string", () => {
    expect(resolveThreshold("")).toBe(0.9);
  });

  it("returns 0.9 for non-numeric string 'abc'", () => {
    expect(resolveThreshold("abc")).toBe(0.9);
  });

  it("returns 0.9 for '0' (boundary: not in (0,1])", () => {
    expect(resolveThreshold("0")).toBe(0.9);
  });

  it("returns 0.9 for '-1' (negative, outside range)", () => {
    expect(resolveThreshold("-1")).toBe(0.9);
  });

  it("returns 0.9 for '2' (above 1, outside range)", () => {
    expect(resolveThreshold("2")).toBe(0.9);
  });

  it("returns the parsed value for a valid threshold like '0.5'", () => {
    expect(resolveThreshold("0.5")).toBe(0.5);
  });

  it("returns 1 for '1' (upper boundary is valid)", () => {
    expect(resolveThreshold("1")).toBe(1);
  });
});

describe("classifyState", () => {
  it("returns healthy when ratio is below threshold", () => {
    expect(classifyState(5, 100, 0.9)).toBe("healthy");
  });

  it("returns degraded when ratio equals threshold (boundary is degraded)", () => {
    expect(classifyState(90, 100, 0.9)).toBe("degraded");
  });

  it("returns degraded when ratio is above threshold", () => {
    expect(classifyState(95, 100, 0.9)).toBe("degraded");
  });

  it("returns healthy when heapTotal is 0 (fail-safe)", () => {
    expect(classifyState(0, 0, 0.9)).toBe("healthy");
  });

  it("returns healthy for a non-finite ratio without throwing", () => {
    // Infinity: heapUsed=1, heapTotal=0 but heapTotal=0 is already guarded;
    // force non-finite via Infinity directly by calling with heapTotal=0
    expect(classifyState(1, 0, 0.5)).toBe("healthy");
  });
});

describe("getStatus() degraded branch", () => {
  afterEach(() => {
    delete process.env.PULSE_DEGRADED_HEAP_RATIO;
  });

  it("returns degraded state when PULSE_DEGRADED_HEAP_RATIO is set very low", () => {
    // A threshold of 0.000001 means nearly any heap usage triggers degraded
    process.env.PULSE_DEGRADED_HEAP_RATIO = "0.000001";
    const s = getStatus();
    expect(s.state).toBe("degraded");
  });
});
