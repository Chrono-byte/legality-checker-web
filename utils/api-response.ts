const BASE_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "X-Content-Type-Options": "nosniff",
};

export class ApiResponse {
  static success<T>(data: T, status = 200, extraHeaders = {}) {
    return new Response(
      JSON.stringify(data),
      {
        status,
        headers: { ...BASE_HEADERS, ...extraHeaders },
      },
    );
  }

  static error(message: string, status = 400, extraHeaders = {}) {
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...BASE_HEADERS, ...extraHeaders },
      },
    );
  }

  static options() {
    return new Response(null, {
      status: 204,
      headers: BASE_HEADERS,
    });
  }
}
