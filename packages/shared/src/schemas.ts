import { type } from "arktype";

// ---------------------------------------------------------------------------
// PostSchema — a discussion post submitted by a user
// ---------------------------------------------------------------------------
export const PostSchema = type({
  content: "string",
  origin_lang: "string",
  semantic_tag_ids: "string[]",
  geo_scope: {
    country: "string",
    "region?": "string",
  },
});

export type Post = typeof PostSchema.infer;

// ---------------------------------------------------------------------------
// TagSchema — a semantic tag with multilingual labels
// e.g. { tag_id: "coffee", labels: { en: "Coffee", zh: "咖啡", ja: "コーヒー" } }
// ---------------------------------------------------------------------------
export const TagSchema = type({
  tag_id: "string",
  labels: "Record<string, string>",
});

export type Tag = typeof TagSchema.infer;

// ---------------------------------------------------------------------------
// FilterSchema — 4-dimensional filter for discovering posts
// ---------------------------------------------------------------------------
export const FilterSchema = type({
  "topic?": "string",
  "language?": "string",
  "region?": "string",
  "country?": "string",
});

export type Filter = typeof FilterSchema.infer;

// ---------------------------------------------------------------------------
// DictionarySchema — i18n UI dictionary (Single Source of Truth for all
// UI strings). Any translation file MUST satisfy this schema.
// ---------------------------------------------------------------------------
export const DictionarySchema = type({
  common: {
    search: "string",
    filter: "string",
    post: "string",
    translate: "string",
  },
  filters: {
    topic: "string",
    language: "string",
    region: "string",
    country: "string",
  },
});

export type Dictionary = typeof DictionarySchema.infer;
