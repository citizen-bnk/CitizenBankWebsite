/** Same-origin API transport. Only safe reads retry; mutations need an explicit user decision. */
export async function resilientFetch(input: RequestInfo | URL, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const safeRead = method === "GET" || method === "HEAD";
  const once = async (): Promise<Response> => {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    init.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } catch {
      if (init.signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
      return new Response(JSON.stringify({
        detail: timedOut ? "The request took too long. Check its status before trying again." : "Connection interrupted. Check your connection and try again.",
        code: timedOut ? "REQUEST_TIMEOUT" : "CONNECTION_INTERRUPTED",
      }), { status: timedOut ? 504 : 502, headers: { "content-type": "application/json", "retry-after": "5" } });
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", abort);
    }
  };

  let response = await once();
  if (safeRead && [502, 503, 504].includes(response.status)) {
    await response.body?.cancel();
    if (init.signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    await new Promise(resolve => setTimeout(resolve, 250));
    response = await once();
  }
  if ([502, 503, 504].includes(response.status) && !response.headers.get("content-type")?.includes("application/json")) {
    await response.body?.cancel();
    return new Response(JSON.stringify({ detail: "The service is temporarily unavailable. Please try again shortly.", code: "SERVICE_UNAVAILABLE" }), { status: response.status, headers: { "content-type": "application/json", "retry-after": "5" } });
  }
  return response;
}
