import type { APIEvent } from "@solidjs/start/server";
import { api } from "~/server/api";

// Catch-all API handler: delegates every /api/* request to the Elysia instance.
// This is how SolidStart + Elysia coexist in a single Vinxi process.
// Elysia handles routing, validation, and Eden Treaty type inference.

export async function GET(event: APIEvent) {
  return api.handle(event.request);
}

export async function POST(event: APIEvent) {
  return api.handle(event.request);
}

export async function PUT(event: APIEvent) {
  return api.handle(event.request);
}

export async function PATCH(event: APIEvent) {
  return api.handle(event.request);
}

export async function DELETE(event: APIEvent) {
  return api.handle(event.request);
}
