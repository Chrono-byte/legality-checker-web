// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

interface RequestConfig {
  method?: string;
  body?: unknown;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

interface RetryConfig {
  maxRetries: number;
  timeout: number;
  backoff: (retryCount: number) => number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  timeout: 15000,
  backoff: (retryCount) => Math.pow(2, retryCount) * 1000,
};

export class ApiClient {
  private static instance: ApiClient;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const {
      method = "GET",
      body,
      timeout = DEFAULT_RETRY_CONFIG.timeout,
      maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
      headers = {},
    } = config;

    let retries = 0;
    const controller = new AbortController();
    let timeoutId: number | undefined;

    while (retries <= maxRetries) {
      try {
        timeoutId = setTimeout(
          () => controller.abort(),
          timeout + (retries * 5000),
        );

        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          keepalive: true,
        });

        clearTimeout(timeoutId);
        timeoutId = undefined;

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          if (response.status === 429 && retries < maxRetries) {
            retries++;
            const retryAfter = response.headers.get("Retry-After");
            const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw new ApiError(
            data.error || `API request failed (${response.status})`,
            response.status,
            data,
          );
        }

        return await response.json();
      } catch (error: unknown) {
        if (timeoutId) clearTimeout(timeoutId);

        if (error instanceof ApiError) {
          throw error;
        }

        if (error instanceof Error) {
          if (
            error.name === "AbortError" ||
            error.name === "TypeError" ||
            error.message.includes("network")
          ) {
            if (retries < maxRetries) {
              retries++;
              await new Promise((resolve) =>
                setTimeout(resolve, DEFAULT_RETRY_CONFIG.backoff(retries))
              );
              continue;
            }
            throw new NetworkError(error.message);
          }
        }
        throw error;
      }
    }

    throw new NetworkError("Request failed after maximum retries");
  }
}
