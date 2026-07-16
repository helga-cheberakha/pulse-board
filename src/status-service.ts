import type { StatusSnapshot } from "./types.js";

const startedAt = Date.now();

export function getStatus(): StatusSnapshot {
  return {
    version: process.env.npm_package_version ?? "0.0.0",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    lastCheckedAt: new Date().toISOString(),
  };
}
