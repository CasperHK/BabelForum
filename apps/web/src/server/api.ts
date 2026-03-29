import Elysia, { t } from "elysia";
import { cors } from "@elysiajs/cors";
import type { Post, Tag } from "@babel-forum/shared";

// ---------------------------------------------------------------------------
// Mock data store — will be replaced by a real DB later
// ---------------------------------------------------------------------------
const mockTags: Tag[] = [
  { tag_id: "coffee", labels: { en: "Coffee", "zh-TW": "咖啡", ja: "コーヒー" } },
  { tag_id: "tech", labels: { en: "Technology", "zh-TW": "科技", ja: "テクノロジー" } },
  { tag_id: "food", labels: { en: "Food", "zh-TW": "美食", ja: "グルメ" } },
  { tag_id: "culture", labels: { en: "Culture", "zh-TW": "文化", ja: "文化" } },
  { tag_id: "travel", labels: { en: "Travel", "zh-TW": "旅遊", ja: "旅行" } },
];

type StoredPost = Post & {
  id: string;
  created_at: string;
  translated?: Record<string, string>;
};

const mockPosts: StoredPost[] = [
  {
    id: "1",
    content: "台灣的咖啡文化正在蓬勃發展，每個角落都有精品咖啡館。",
    origin_lang: "zh-TW",
    semantic_tag_ids: ["coffee", "culture"],
    geo_scope: { country: "TW", region: "Taipei" },
    created_at: "2026-03-01T08:00:00Z",
    translated: {
      en: "Taiwan's coffee culture is flourishing, with specialty cafes on every corner.",
      ja: "台湾のコーヒー文化は急成長しており、いたるところにスペシャルティカフェがあります。",
    },
  },
  {
    id: "2",
    content: "AI技術が日本の伝統工芸を革新している。",
    origin_lang: "ja",
    semantic_tag_ids: ["tech", "culture"],
    geo_scope: { country: "JP", region: "Tokyo" },
    created_at: "2026-03-02T09:00:00Z",
    translated: {
      en: "AI technology is revolutionizing traditional Japanese crafts.",
      "zh-TW": "AI 技術正在革新日本的傳統工藝。",
    },
  },
  {
    id: "3",
    content: "Street food in Southeast Asia tells the story of its diverse cultures.",
    origin_lang: "en",
    semantic_tag_ids: ["food", "culture", "travel"],
    geo_scope: { country: "TH", region: "Bangkok" },
    created_at: "2026-03-03T10:00:00Z",
    translated: {
      "zh-TW": "東南亞的街頭美食訴說著多元文化的故事。",
      ja: "東南アジアのストリートフードは、多様な文化の物語を語っています。",
    },
  },
];

// ---------------------------------------------------------------------------
// Mock translation / semantic alignment middleware
// In production this will call an LLM API (e.g. OpenAI, Anthropic).
// ---------------------------------------------------------------------------
function mockTranslate(content: string, targetLang: string): string {
  return `[${targetLang.toUpperCase()} translation pending] ${content}`;
}

// ---------------------------------------------------------------------------
// Elysia instance — exported so Eden Treaty can infer the full API type
// ---------------------------------------------------------------------------
export const api = new Elysia({ prefix: "/api" })
  .use(cors())
  // Attach translation helper to every request context
  .derive(() => ({ translate: mockTranslate }))

  // GET /api/tags — return all semantic tags
  .get("/tags", () => mockTags)

  // GET /api/posts — 4D filtered post list
  .get(
    "/posts",
    ({ query }) => {
      let results = [...mockPosts];

      if (query.language) {
        results = results.filter((p) => p.origin_lang === query.language);
      }
      if (query.country) {
        results = results.filter(
          (p) => p.geo_scope.country === query.country,
        );
      }
      if (query.region) {
        results = results.filter(
          (p) => p.geo_scope.region === query.region,
        );
      }
      if (query.topic) {
        results = results.filter((p) =>
          p.semantic_tag_ids.includes(query.topic as string),
        );
      }

      return results;
    },
    {
      query: t.Object({
        topic: t.Optional(t.String()),
        language: t.Optional(t.String()),
        region: t.Optional(t.String()),
        country: t.Optional(t.String()),
      }),
    },
  )

  // POST /api/posts — create a new post (with mock translation enrichment)
  .post(
    "/posts",
    ({ body, translate }) => {
      const newPost: StoredPost = {
        ...body,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        translated: {
          en:
            body.origin_lang !== "en"
              ? translate(body.content, "en")
              : body.content,
        },
      };
      mockPosts.unshift(newPost);
      return newPost;
    },
    {
      body: t.Object({
        content: t.String(),
        origin_lang: t.String(),
        semantic_tag_ids: t.Array(t.String()),
        geo_scope: t.Object({
          country: t.String(),
          region: t.Optional(t.String()),
        }),
      }),
    },
  )

  // POST /api/posts/:id/translate — on-demand translation
  .post(
    "/posts/:id/translate",
    ({ params, body, translate }) => {
      const post = mockPosts.find((p) => p.id === params.id);
      if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
          status: 404,
        });
      }

      const cached = post.translated?.[body.target_lang];
      if (cached) return { translated: cached, cached: true };

      const result = translate(post.content, body.target_lang);
      post.translated = { ...post.translated, [body.target_lang]: result };
      return { translated: result, cached: false };
    },
    {
      body: t.Object({
        target_lang: t.String(),
      }),
    },
  );

// Eden Treaty type export — the single type that ties frontend to backend
export type Api = typeof api;
