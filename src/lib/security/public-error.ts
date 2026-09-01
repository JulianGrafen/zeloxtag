import "server-only";

/** Patterns that must never reach clients (providers, DB, paths, secrets). */
const INTERNAL_MESSAGE_PATTERN =
  /api[_-]?key|secret|token|password|authorization|unauthorized|invalid api key|sk[-_]?(?:live|test)|postgres|supabase|pgrst|postgrest|service.?role|row.?level|violates|duplicate key|ECONNREF|ETIMEDOUT|ENOTFOUND|fetch failed|network|socket|\/Users\/|\.tsx?:\d+|at\s+\w+\s+\(|sql state|42P\d{2}|22P\d{2}|JWT|Bearer\s/i;

const SAFE_AUTH_PATTERNS = [
  /^invalid login credentials$/i,
  /^email not confirmed$/i,
  /^user already registered$/i,
  /^password should be at least/i,
  /^signup requires a valid password/i,
  /^invalid refresh token$/i,
  /^refresh token not found$/i,
  /^email rate limit exceeded$/i,
  /^for security purposes/i,
];

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "string") return error.trim();
  return "";
}

export function isInternalErrorMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (trimmed.length > 240) return true;
  return INTERNAL_MESSAGE_PATTERN.test(trimmed);
}

/** App-thrown, user-facing copy — still filtered for accidental internals. */
export function isPublicClientMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 200) return false;
  return !isInternalErrorMessage(trimmed);
}

export function publicClientMessage(error: unknown, fallback: string): string {
  const message = errorMessage(error);
  return isPublicClientMessage(message) ? message : fallback;
}

export function publicAuthMessage(
  error: unknown,
  fallback = "Anmeldung fehlgeschlagen.",
): string {
  const raw = errorMessage(error);
  if (!raw) return fallback;
  if (SAFE_AUTH_PATTERNS.some((pattern) => pattern.test(raw))) return raw;
  return fallback;
}

/** Fixed migration hint when a missing column is detected server-side. */
export function migrationHintMessage(
  error: unknown,
  columnSubstring: string,
  hint: string,
  fallback: string,
): string {
  if (errorMessage(error).includes(columnSubstring)) return hint;
  return fallback;
}

export function logServerError(
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  if (meta && Object.keys(meta).length > 0) {
    console.error(scope, error, meta);
    return;
  }
  console.error(scope, error);
}
