import { type PageProps } from "fresh";

interface ErrorWithStatus extends Error {
  status?: number;
}

export default function Error(props: PageProps) {
  const error = props.error as ErrorWithStatus;

  // Handle 404 errors
  if (error?.status === 404) {
    return (
      <div class="px-4 py-8 mx-auto bg-white">
        <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
          <h1 class="text-4xl font-bold text-green-700">
            404 - Page not found
          </h1>
          <p class="my-4 text-gray-600">
            The page you were looking for doesn't exist.
          </p>
          <a
            href="/"
            class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition-colors"
          >
            Go back home
          </a>
        </div>
      </div>
    );
  }

  // Handle known errors
  if (error instanceof Error) {
    return (
      <div class="px-4 py-8 mx-auto bg-white">
        <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
          <h1 class="text-4xl font-bold text-green-700">
            An error occurred
          </h1>
          <p class="my-4 text-gray-600">
            {error.message || "Something went wrong. Please try again later."}
          </p>
          <a
            href="/"
            class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition-colors"
          >
            Go back home
          </a>
        </div>
      </div>
    );
  }

  // Handle unknown errors
  return (
    <div class="px-4 py-8 mx-auto bg-white">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <h1 class="text-4xl font-bold text-green-700">
          500 - Internal Server Error
        </h1>
        <p class="my-4 text-gray-600">
          An unexpected error occurred. Please try again later.
        </p>
        <a
          href="/"
          class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition-colors"
        >
          Go back home
        </a>
      </div>
    </div>
  );
}
