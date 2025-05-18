import { type PageProps } from "$fresh/server.ts";
import NavBar from "../islands/NavBar.tsx";
import Footer from "../components/Footer.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html lang="en" class="h-full">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pioneer Highlander</title>
        <meta
          name="description"
          content="Pioneer Highlander (PHL) - A singleton format that brings Commander's variety to Pioneer"
        />

        {/* Open Graph / Social Media Meta Tags */}
        <meta property="og:title" content="Pioneer Highlander" />
        <meta
          property="og:description"
          content="A singleton format that brings Commander's variety to Pioneer"
        />
        <meta property="og:type" content="website" />

        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />

        {/* Preload critical assets */}
        <link rel="preload" href="/styles.css" as="style" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="flex flex-col min-h-screen">
        <NavBar />
        <main class="flex-grow">
          <div class="max-w-4xl mx-auto px-4 py-12 min-h-[calc(100vh-4rem)]">
            <Component />
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
