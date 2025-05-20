import NavBar from "../islands/NavBar.tsx";
import Footer from "../components/Footer.tsx";
import type { PageProps } from "fresh";

export interface State {
  title?: string;
  description?: string;
}

export default function App({ Component, state }: PageProps<unknown, State>) {
  const title = state?.title || "Pioneer Highlander";
  const description = state?.description ||
    "Pioneer Highlander (PHL) - A singleton format that brings Commander's variety to Pioneer";

  return (
    <html lang="en" class="h-full">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={description} />

        {/* Open Graph / Social Media Meta Tags */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />

        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />

        {/* Preload critical assets */}
        <link rel="preload" href="/styles.css" as="style" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="flex flex-col min-h-screen">
        <NavBar />
        <main class="flex-grow bg-gradient-to-b from-white via-green-10 to-green-50">
          <div class="max-w-5xl mx-auto px-4 py-12 min-h-[calc(100vh-4rem)]">
            <Component />
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
