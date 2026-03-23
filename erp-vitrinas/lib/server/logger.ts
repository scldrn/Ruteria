export function logServerError(
  scope: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  console.error(`[${scope}]`, {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...metadata,
  })
}
