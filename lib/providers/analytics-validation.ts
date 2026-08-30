import type { AnalyticsRequest, AnalyticsResult } from "./contracts";

const METRIC_PATTERN = /^[a-zA-Z0-9._:-]{1,100}$/;
const DIMENSION_KEY_PATTERN = /^[a-zA-Z0-9._:-]{1,50}$/;
const DIMENSION_VALUE_MAX = 200;
const MAX_DIMENSIONS = 20;

export function parseAnalyticsRequest(input: unknown): AnalyticsRequest {
  if (!input || typeof input !== "object") throw new Error("ANALYTICS_INVALID_REQUEST");
  const body = input as Record<string, unknown>;
  const metric = typeof body.metric === "string" ? body.metric.trim() : "";
  if (!METRIC_PATTERN.test(metric)) throw new Error("ANALYTICS_INVALID_METRIC");

  const rawDimensions = body.dimensions;
  if (rawDimensions === undefined) return { metric };
  if (!rawDimensions || typeof rawDimensions !== "object" || Array.isArray(rawDimensions)) {
    throw new Error("ANALYTICS_INVALID_DIMENSIONS");
  }

  const entries = Object.entries(rawDimensions as Record<string, unknown>);
  if (entries.length > MAX_DIMENSIONS) throw new Error("ANALYTICS_TOO_MANY_DIMENSIONS");
  const dimensions: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!DIMENSION_KEY_PATTERN.test(key) || typeof value !== "string" || value.length > DIMENSION_VALUE_MAX) {
      throw new Error("ANALYTICS_INVALID_DIMENSION");
    }
    dimensions[key] = value;
  }
  return { metric, dimensions };
}

export function validateAnalyticsResult(input: unknown): AnalyticsResult {
  if (!input || typeof input !== "object") throw new Error("ANALYTICS_INVALID_PROVIDER_RESPONSE");
  const body = input as Record<string, unknown>;
  if (typeof body.value !== "number" || !Number.isFinite(body.value)) throw new Error("ANALYTICS_INVALID_PROVIDER_RESPONSE");
  if (typeof body.source !== "string" || !body.source.trim() || body.source.length > 200) {
    throw new Error("ANALYTICS_INVALID_PROVIDER_RESPONSE");
  }
  if (body.unit !== undefined && (typeof body.unit !== "string" || body.unit.length > 50)) {
    throw new Error("ANALYTICS_INVALID_PROVIDER_RESPONSE");
  }
  return {
    value: body.value,
    source: body.source.trim(),
    ...(body.unit === undefined ? {} : { unit: body.unit }),
  };
}
