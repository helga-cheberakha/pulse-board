export interface StatusSnapshot {
  version: string;
  uptimeSeconds: number;
  lastCheckedAt: string;
  state: "healthy" | "degraded";
}

export interface HealthSnapshot {
  status: "ok";
}
