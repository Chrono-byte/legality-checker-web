import { FreshContext } from "$fresh/server.ts";
import { RateLimiter } from "./rate-limiter.ts";
import { ApiResponse } from "./api-response.ts";

// Singleton instance for rate limiting
const rateLimiter = new RateLimiter();

export async function withRateLimit(
  req: Request,
  ctx: FreshContext,
  handler: (req: Request, ctx: FreshContext) => Promise<Response>,
): Promise<Response> {
  try {
    const clientIp = ctx.remoteAddr.hostname;
    const rateLimit = rateLimiter.check(clientIp);

    if (!rateLimit.allowed) {
      return ApiResponse.error(
        "Rate limit exceeded",
        429,
        rateLimit.headers,
      );
    }

    const response = await handler(req, ctx);
    // Add rate limit headers to the response
    const headers = new Headers(response.headers);
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("API Error:", error);
    return ApiResponse.error(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}
