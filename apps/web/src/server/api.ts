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
    id: "9",
    content: "Bangkok's late-night coffee shops have become a real bridge between startup culture and local street life.",
    origin_lang: "en",
    semantic_tag_ids: ["coffee", "tech", "travel"],
    geo_scope: { country: "TH", region: "Bangkok" },
    created_at: "2026-03-09T12:10:00Z",
    translated: {
      "zh-TW": "曼谷的深夜咖啡館，正在成為新創文化與在地街頭生活之間的橋梁。",
      ja: "バンコクの深夜営業のカフェは、スタートアップ文化と地元の街の暮らしをつなぐ場になっています。",
    },
  },
  {
    id: "8",
    content: "シンガポールでは多言語コミュニティ向けのAIイベントが毎月のように増えている。",
    origin_lang: "ja",
    semantic_tag_ids: ["tech", "culture", "travel"],
    geo_scope: { country: "SG", region: "Singapore" },
    created_at: "2026-03-08T18:45:00Z",
    translated: {
      en: "In Singapore, AI events for multilingual communities seem to be increasing every month.",
      "zh-TW": "在新加坡，面向多語社群的 AI 活動幾乎每個月都在增加。",
    },
  },
  {
    id: "7",
    content: "台北的獨立書店最近開始和咖啡館合作舉辦跨語言讀書會。",
    origin_lang: "zh-TW",
    semantic_tag_ids: ["coffee", "culture"],
    geo_scope: { country: "TW", region: "Taipei" },
    created_at: "2026-03-07T07:20:00Z",
    translated: {
      en: "Independent bookstores in Taipei have started partnering with cafes to host cross-language reading groups.",
      ja: "台北の独立系書店では、カフェと協力して多言語読書会を開く動きが広がっています。",
    },
  },
  {
    id: "6",
    content: "Oaxaca's markets are the best place to understand how food and local identity stay connected.",
    origin_lang: "en",
    semantic_tag_ids: ["food", "culture", "travel"],
    geo_scope: { country: "MX", region: "Oaxaca" },
    created_at: "2026-03-06T11:05:00Z",
    translated: {
      "zh-TW": "瓦哈卡的市場最能看出，美食與地方認同是如何緊密連結的。",
      ja: "オアハカの市場は、食と地域のアイデンティティがどう結びついているかを理解するのに最適です。",
    },
  },
  {
    id: "5",
    content: "ソウルのカフェはリモートワークの拠点というだけでなく、新しいコミュニティを作る場所でもある。",
    origin_lang: "ja",
    semantic_tag_ids: ["coffee", "tech", "culture"],
    geo_scope: { country: "KR", region: "Seoul" },
    created_at: "2026-03-05T16:30:00Z",
    translated: {
      en: "Cafes in Seoul are not just remote-work hubs, but places where new communities form.",
      "zh-TW": "首爾的咖啡館不只是遠端工作的據點，也是在建立新社群的地方。",
    },
  },
  {
    id: "4",
    content: "京都的小型旅館越來越重視用雙語內容介紹在地餐飲文化。",
    origin_lang: "zh-TW",
    semantic_tag_ids: ["food", "travel", "culture"],
    geo_scope: { country: "JP", region: "Kyoto" },
    created_at: "2026-03-04T13:15:00Z",
    translated: {
      en: "Small inns in Kyoto are increasingly using bilingual content to introduce local food culture.",
      ja: "京都の小規模な宿では、地域の食文化を紹介するためにバイリンガルな案内が増えています。",
    },
  },
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

      return results.sort((left, right) =>
        right.created_at.localeCompare(left.created_at),
      );
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
