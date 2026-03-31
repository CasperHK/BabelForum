import {
  createResource,
  createSignal,
  For,
  Show,
  Suspense,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { isServer } from "solid-js/web";
import { useI18n } from "~/context/i18n";
import { usePostComposer } from "~/context/post-composer";
import type { Post, Tag } from "@babel-forum/shared";

// ---------------------------------------------------------------------------
// Route-local response shapes
// ---------------------------------------------------------------------------
type SinglePost = Post & {
  id: string;
  created_at: string;
  translated?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// PostCard — displays a single post with a Translate toggle.
// Tag labels are resolved from the tag dictionary using currentLang.
// ---------------------------------------------------------------------------
function PostCard(props: { post: SinglePost; tags: Tag[] }) {
  const { locale, t, bilingual } = useI18n();
  const [showTranslation, setShowTranslation] = createSignal(false);

  const resolveTagLabel = (tagId: string) => {
    const tag = props.tags.find((t) => t.tag_id === tagId);
    if (!tag) return tagId;
    const label = tag.labels[locale()] ?? tag.labels["en"] ?? tagId;
    if (bilingual() && locale() !== "en") {
      const en = tag.labels["en"] ?? tagId;
      return `${label} / ${en}`;
    }
    return label;
  };

  const translatedContent = () => {
    const p = props.post as SinglePost & { translated?: Record<string, string> };
    return p.translated?.[locale()] ?? p.translated?.["en"] ?? null;
  };

  return (
    <article class="post-card">
      <header class="post-card-header">
        {/* Language & geo badges */}
        <span class="badge badge-lang">{props.post.origin_lang}</span>
        <span class="badge badge-geo">
          {props.post.geo_scope.country}
          {props.post.geo_scope.region ? ` · ${props.post.geo_scope.region}` : ""}
        </span>
        <time class="post-time">
          {new Date(props.post.created_at).toLocaleDateString()}
        </time>
      </header>

      {/* Content */}
      <p class="post-content">
        {showTranslation() && translatedContent()
          ? translatedContent()
          : props.post.content}
      </p>

      {/* Semantic tags — labels resolved per current locale */}
      <div class="post-tags">
        <For each={props.post.semantic_tag_ids}>
          {(id) => <span class="tag">{resolveTagLabel(id)}</span>}
        </For>
      </div>

      {/* Translate toggle */}
      <Show when={translatedContent()}>
        <button
          type="button"
          class="btn-translate"
          onClick={() => setShowTranslation((v) => !v)}
        >
          {showTranslation()
            ? `← ${props.post.origin_lang.toUpperCase()}`
            : `${t("common", "translate")} →`}
        </button>
      </Show>
    </article>
  );
}

// ---------------------------------------------------------------------------
// FilterSidebar — 4D filter that updates URL search params
// ---------------------------------------------------------------------------
function FilterSidebar() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const set = (key: string, value: string) => {
    setSearchParams({ ...searchParams, [key]: value || undefined });
  };

  return (
    <aside class="filter-sidebar">
      <h2 class="filter-title">{t("common", "filter")}</h2>

      <label class="filter-label">
        {t("filters", "topic")}
        <input
          class="filter-input"
          type="text"
          value={searchParams.topic ?? ""}
          onInput={(e) => set("topic", e.currentTarget.value)}
          placeholder={t("filters", "topic")}
        />
      </label>

      <label class="filter-label">
        {t("filters", "language")}
        <select
          class="filter-input"
          value={searchParams.language ?? ""}
          onChange={(e) => set("language", e.currentTarget.value)}
        >
          <option value="">— {t("filters", "language")} —</option>
          <option value="en">English</option>
          <option value="zh-TW">繁體中文</option>
          <option value="ja">日本語</option>
        </select>
      </label>

      <label class="filter-label">
        {t("filters", "region")}
        <input
          class="filter-input"
          type="text"
          value={searchParams.region ?? ""}
          onInput={(e) => set("region", e.currentTarget.value)}
          placeholder={t("filters", "region")}
        />
      </label>

      <label class="filter-label">
        {t("filters", "country")}
        <input
          class="filter-input"
          type="text"
          value={searchParams.country ?? ""}
          onInput={(e) => set("country", e.currentTarget.value)}
          placeholder={t("filters", "country")}
        />
      </label>

      <button
        type="button"
        class="btn-secondary"
        onClick={() => setSearchParams({})}
      >
        ✕ Reset
      </button>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Home page — wires everything together
// ---------------------------------------------------------------------------
export default function Home() {
  const { t } = useI18n();
  const { postsVersion } = usePostComposer();
  const [searchParams] = useSearchParams();

  // Normalize search params: SolidStart returns string | string[] | undefined;
  // the API query schema expects string | undefined only.
  const sp = (key: keyof typeof searchParams): string | undefined => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };

  // Re-fetch whenever search params change (fine-grained reactivity)
  const [posts] = createResource(
    () => ({
      enabled: !isServer,
      topic: sp("topic"),
      language: sp("language"),
      region: sp("region"),
      country: sp("country"),
      refreshKey: postsVersion(),
    }),
    async ({ enabled, refreshKey: _refreshKey, ...filters }) => {
      if (!enabled) return [];
      const query = new URLSearchParams();

      for (const [key, value] of Object.entries(filters)) {
        if (value) query.set(key, value);
      }

      const response = await fetch(`/api/posts?${query.toString()}`);
      if (!response.ok) throw new Error("Failed to load posts.");
      return (await response.json()) as SinglePost[];
    },
  );

  const [tags] = createResource(() => !isServer, async (enabled) => {
    if (!enabled) return [];
    const response = await fetch("/api/tags");
    if (!response.ok) throw new Error("Failed to load tags.");
    return (await response.json()) as Tag[];
  });

  return (
    <div class="home-layout">
      <FilterSidebar />

      <main class="posts-feed">
        <h1 class="feed-title">{t("common", "search")}</h1>

        <Suspense fallback={<p class="loading">Loading…</p>}>
          <Show
            when={(posts() ?? []).length > 0}
            fallback={<p class="empty">No posts found.</p>}
          >
            <For each={posts() ?? []}>
              {(post) => <PostCard post={post} tags={tags() ?? []} />}
            </For>
          </Show>
        </Suspense>
      </main>
    </div>
  );
}
