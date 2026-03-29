/**
 * Quick example (matches curl usage):
 *   await callDataApi("Youtube/search", {
 *     query: { gl: "US", hl: "en", q: "manus" },
 *   })
 */
import { ENV } from "./env";

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 1000; // 1s, 2s, 4s, 8s

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("webdevtoken.v1.WebDevService/CallApi", baseUrl).toString();

  const requestBody = JSON.stringify({
    apiId,
    query: options.query,
    body: options.body,
    path_params: options.pathParams,
    multipart_form_data: options.formData,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[DataApi] Retry ${attempt}/${MAX_RETRIES} for ${apiId} after ${delayMs}ms...`);
      await sleep(delayMs);
    }

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "connect-protocol-version": "1",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: requestBody,
    });

    // Rate limited — back off and retry
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[DataApi] Rate limited (429) on ${apiId}. Waiting ${retryAfterMs}ms before retry...`);
      lastError = new Error(`Data API rate limited (429) for ${apiId}`);
      await sleep(retryAfterMs);
      continue;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Data API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
    }

    const payload = await response.json().catch(() => ({}));
    if (payload && typeof payload === "object" && "jsonData" in payload) {
      try {
        return JSON.parse((payload as Record<string, string>).jsonData ?? "{}");
      } catch {
        return (payload as Record<string, unknown>).jsonData;
      }
    }
    return payload;
  }

  throw lastError ?? new Error(`Data API request failed after ${MAX_RETRIES} retries for ${apiId}`);
}
