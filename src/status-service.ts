import type { StatusSnapshot } from "./types.js";

const startedAt = Date.now();

const DEFAULT_THRESHOLD = 0.9;

export function resolveThreshold(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_THRESHOLD;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 1) return DEFAULT_THRESHOLD;
  return parsed;
}

export function classifyState(
  heapUsed: number,
  heapTotal: number,
  threshold: number,
): "healthy" | "degraded" {
  if (heapTotal === 0) return "healthy";
  const ratio = heapUsed / heapTotal;
  if (!Number.isFinite(ratio)) return "healthy";
  return ratio >= threshold ? "degraded" : "healthy";
}

export function getStatus(): StatusSnapshot {
  const { heapUsed, heapTotal } = process.memoryUsage();
  const threshold = resolveThreshold(process.env.PULSE_DEGRADED_HEAP_RATIO);
  return {
    version: process.env.npm_package_version ?? "0.0.0",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    lastCheckedAt: new Date().toISOString(),
    state: classifyState(heapUsed, heapTotal, threshold),
  };
}
