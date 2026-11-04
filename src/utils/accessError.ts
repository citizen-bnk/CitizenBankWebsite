/** The generated API client throws HTTP Responses, rather than Error objects. */
export async function accessError(cause: unknown): Promise<Error> {
  if (cause instanceof Response) {
    const body = await cause.clone().json().catch(() => null);
    return new Error(typeof body?.detail === "string" ? body.detail : `Access check failed (${cause.status}). Retry or sign in again.`);
  }
  return cause instanceof Error ? cause : new Error("Access could not be checked. Retry or sign in again.");
}
