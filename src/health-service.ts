import type { HealthSnapshot } from "./types.js";

export function getHealth(): HealthSnapshot {
  return { status: "ok" };
}
