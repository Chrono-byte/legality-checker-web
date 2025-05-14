import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found | PHL Legality Checker</title>
      </Head>
      <div class="px-4 py-8 mx-auto bg-white">
        <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
          <h1 class="text-4xl font-bold text-green-700">404 - Page not found</h1>
          <p class="my-4 text-gray-600">
            The page you were looking for doesn't exist.
          </p>
          <a href="/" class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition-colors">
            Go back home
          </a>
        </div>
      </div>
    </>
  );
}
