export class ApiError extends Error {
  status: number;
  bodyText: string;

  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
};

export async function http<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, cache = "no-store" } = opts;

  const res = await fetch(url, {
    method,
    cache,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  // Debug (optional): uncomment if you want global logs
  // console.log("[HTTP]", method, url, res.status, text);

  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status} for ${method} ${url}`, res.status, text);
  }

  // Handle empty response (some DELETE responses)
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    // If API returns plain text
    return text as unknown as T;
  }
}
