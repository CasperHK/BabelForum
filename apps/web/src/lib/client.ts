import { treaty } from "@elysiajs/eden";
import type { Api } from "~/server/api";

// Eden Treaty client — fully typed via the exported Api type.
// In the browser it connects to the same origin; on the server
// it uses the internal address (both run in the same Bun process).
const API_BASE =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

export const client = treaty<Api>(API_BASE);
