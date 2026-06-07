const ORIGIN_ENV_KEYS = ["APP_ORIGIN", "APP_ORIGINS", "ALLOWED_APP_ORIGINS"] as const;

export function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

export function getConfiguredOrigins() {
  return ORIGIN_ENV_KEYS.flatMap((key) =>
    (process.env[key] || "")
      .split(/[\s,]+/)
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin))
  );
}

export function getHeaderDerivedOrigin(headers: Headers, fallbackOrigin?: string) {
  const forwardedHost = firstHeaderValue(headers.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(headers.get("host"));
  const forwardedProto = firstHeaderValue(headers.get("x-forwarded-proto"));
  const fallbackProtocol = fallbackOrigin ? normalizeOrigin(fallbackOrigin)?.split(":")[0] : null;
  const protocol = forwardedProto || fallbackProtocol || "http";

  return host ? normalizeOrigin(`${protocol}://${host}`) : normalizeOrigin(fallbackOrigin);
}

export function isHttpsOrigin(origin: string | null | undefined) {
  return Boolean(origin && normalizeOrigin(origin)?.startsWith("https://"));
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}
