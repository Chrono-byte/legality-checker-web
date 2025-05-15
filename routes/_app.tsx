import { type PageProps } from "$fresh/server.ts";
import NavBar from "../components/NavBar.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PHL Legality Checker</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <NavBar />
        <main class="min-h-screen bg-white">
          <Component />
        </main>
      </body>
    </html>
  );
}
