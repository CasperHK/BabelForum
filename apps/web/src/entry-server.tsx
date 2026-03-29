import { createHandler, StartServer } from "@solidjs/start/server";

// Standard SolidStart SSR entry point.
// API requests at /api/* are handled by SolidStart's file-based API routes
// (see src/routes/api/[...path].ts) which delegate to the Elysia instance.
export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Babel Forum</title>
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
