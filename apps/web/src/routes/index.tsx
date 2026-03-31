import {
  createMemo,
  createResource,
  createSignal,
  For,
  onMount,
  Show,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
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

type TopicSummary = {
  tag: Tag;
  postCount: number;
  latestPost: SinglePost;
  latestCreatedAt: string;
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
  const { locale, t } = useI18n();
  const { postsVersion } = usePostComposer();
  const [searchParams, setSearchParams] = useSearchParams();

  // Normalize search params: SolidStart returns string | string[] | undefined;
  // the API query schema expects string | undefined only.
  const sp = (key: keyof typeof searchParams): string | undefined => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };

  // Re-fetch whenever search params change (fine-grained reactivity)
  const [posts, { refetch: refetchPosts }] = createResource(
    () =>
      typeof window === "undefined"
        ? null
        : {
      topic: sp("topic"),
      language: sp("language"),
      region: sp("region"),
      country: sp("country"),
      refreshKey: postsVersion(),
    },
    async (filters) => {
      if (!filters) return [];

      const { refreshKey: _refreshKey, ...queryFilters } = filters;
      const query = new URLSearchParams();

      for (const [key, value] of Object.entries(queryFilters)) {
        if (value) query.set(key, value);
      }

      const response = await fetch(`/api/posts?${query.toString()}`);
      if (!response.ok) throw new Error("Failed to load posts.");
      return (await response.json()) as SinglePost[];
    },
  );

  const [allPosts, { refetch: refetchAllPosts }] = createResource(
    () =>
      typeof window === "undefined"
        ? null
        : {
            refreshKey: postsVersion(),
          },
    async (state) => {
      if (!state) return [];

      const response = await fetch("/api/posts");
      if (!response.ok) throw new Error("Failed to load topic summaries.");
      return (await response.json()) as SinglePost[];
    },
  );

  const [tags, { refetch: refetchTags }] = createResource(
    () => (typeof window === "undefined" ? null : true),
    async (enabled) => {
      if (!enabled) return [];
      const response = await fetch("/api/tags");
      if (!response.ok) throw new Error("Failed to load tags.");
      return (await response.json()) as Tag[];
    },
  );

  const resolveTagLabel = (tag: Tag) => tag.labels[locale()] ?? tag.labels.en ?? tag.tag_id;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale(), {
      month: "short",
      day: "numeric",
    }).format(new Date(value));

  const selectTopic = (topicId: string) => {
    setSearchParams({
      ...searchParams,
      topic: topicId || undefined,
    });
  };

  const topicSummaries = createMemo<TopicSummary[]>(() => {
    const tagList = tags() ?? [];
    const tagIndex = new Map(tagList.map((tag) => [tag.tag_id, tag]));
    const summaries = new Map<string, TopicSummary>();

    for (const post of allPosts() ?? []) {
      for (const tagId of post.semantic_tag_ids) {
        const tag = tagIndex.get(tagId);
        if (!tag) continue;

        const existing = summaries.get(tagId);
        if (!existing) {
          summaries.set(tagId, {
            tag,
            postCount: 1,
            latestPost: post,
            latestCreatedAt: post.created_at,
          });
          continue;
        }

        existing.postCount += 1;
        if (post.created_at > existing.latestCreatedAt) {
          existing.latestCreatedAt = post.created_at;
          existing.latestPost = post;
        }
      }
    }

    return [...summaries.values()];
  });

  const hotTopic = createMemo(() =>
    [...topicSummaries()].sort((left, right) => {
      if (right.postCount !== left.postCount) {
        return right.postCount - left.postCount;
      }
      return right.latestCreatedAt.localeCompare(left.latestCreatedAt);
    })[0],
  );

  const latestTopics = createMemo(() => {
    const featuredTagId = hotTopic()?.tag.tag_id;

    return [...topicSummaries()]
      .filter((topic) => topic.tag.tag_id !== featuredTagId)
      .sort((left, right) =>
        right.latestCreatedAt.localeCompare(left.latestCreatedAt),
      )
      .slice(0, 6);
  });

  onMount(() => {
    void refetchPosts();
    void refetchAllPosts();
    void refetchTags();
  });

  return (
    <div class="home-layout">
      <FilterSidebar />

      <main class="posts-feed">
        <section class="pulse-panel">
          <div class="pulse-header">
            <div>
              <p class="pulse-kicker">Global Pulse</p>
              <h1 class="feed-title">Hot topic and latest topics</h1>
            </div>
            <p class="pulse-summary">
              Live from {topicSummaries().length} active topics across the current demo feed.
            </p>
          </div>

          <Show when={hotTopic()}>
            {(topic) => (
              <button
                type="button"
                class="hot-topic-card"
                onClick={() => selectTopic(topic().tag.tag_id)}
              >
                <div class="topic-card-head">
                  <span class="topic-chip topic-chip-hot">Hot Topic</span>
                  <span class="topic-timestamp">Updated {formatDate(topic().latestCreatedAt)}</span>
                </div>
                <h2 class="hot-topic-title">{resolveTagLabel(topic().tag)}</h2>
                <p class="hot-topic-copy">{topic().latestPost.content}</p>
                <div class="topic-card-meta">
                  <span>{topic().postCount} posts</span>
                  <span>
                    {topic().latestPost.geo_scope.country}
                    {topic().latestPost.geo_scope.region
                      ? ` · ${topic().latestPost.geo_scope.region}`
                      : ""}
                  </span>
                </div>
              </button>
            )}
          </Show>

          <div class="topic-grid">
            <For each={latestTopics()}>
              {(topic) => (
                <button
                  type="button"
                  class="topic-card"
                  onClick={() => selectTopic(topic.tag.tag_id)}
                >
                  <div class="topic-card-head">
                    <span class="topic-chip">Latest Topic</span>
                    <span class="topic-timestamp">{formatDate(topic.latestCreatedAt)}</span>
                  </div>
                  <h3 class="topic-card-title">{resolveTagLabel(topic.tag)}</h3>
                  <p class="topic-card-copy">{topic.latestPost.content}</p>
                  <div class="topic-card-meta">
                    <span>{topic.postCount} posts</span>
                    <span>
                      {topic.latestPost.geo_scope.country}
                      {topic.latestPost.geo_scope.region
                        ? ` · ${topic.latestPost.geo_scope.region}`
                        : ""}
                    </span>
                  </div>
                </button>
              )}
            </For>
          </div>
        </section>

        <section class="feed-section">
          <div class="feed-section-header">
            <h2 class="feed-section-title">Latest voices</h2>
            <p class="feed-section-copy">
              Filtered by topic, language, and geography in real time.
            </p>
          </div>

          <Show
            when={(posts() ?? []).length > 0}
            fallback={<p class="empty">No posts found.</p>}
          >
            <For each={posts() ?? []}>
              {(post) => <PostCard post={post} tags={tags() ?? []} />}
            </For>
          </Show>
        </section>
      </main>
    </div>
  );
}
