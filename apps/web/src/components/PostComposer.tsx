import {
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
} from "solid-js";
import type { Tag } from "@babel-forum/shared";
import {
  SUPPORTED_LOCALES,
  type Locale,
  useI18n,
} from "~/context/i18n";
import { usePostComposer } from "~/context/post-composer";

type FormState = {
  content: string;
  origin_lang: Locale;
  semantic_tag_ids: string[];
  country: string;
  region: string;
};

const COUNTRY_OPTIONS = [
  { code: "TW", label: "Taiwan" },
  { code: "JP", label: "Japan" },
  { code: "TH", label: "Thailand" },
  { code: "KR", label: "South Korea" },
  { code: "SG", label: "Singapore" },
  { code: "MX", label: "Mexico" },
  { code: "US", label: "United States" },
];

function createEmptyForm(locale: Locale): FormState {
  return {
    content: "",
    origin_lang: locale,
    semantic_tag_ids: [],
    country: "",
    region: "",
  };
}

export default function PostComposer() {
  const { locale, bilingual, t } = useI18n();
  const { composerOpen, closeComposer, notifyPostCreated } = usePostComposer();
  const [form, setForm] = createSignal<FormState>(createEmptyForm(locale()));
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const [tags] = createResource(
    () => (typeof window === "undefined" ? false : composerOpen()),
    async (open) => {
    if (!open) return [] as Tag[];
    const response = await fetch("/api/tags");
    if (!response.ok) throw new Error("Failed to load tags.");
    return (await response.json()) as Tag[];
    },
  );

  createEffect(() => {
    if (!composerOpen()) return;
    setForm(createEmptyForm(locale()));
    setErrorMessage(null);
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetAndClose = () => {
    setForm(createEmptyForm(locale()));
    setErrorMessage(null);
    closeComposer();
  };

  const resolveTagLabel = (tag: Tag) => {
    const label = tag.labels[locale()] ?? tag.labels.en ?? tag.tag_id;
    if (bilingual() && locale() !== "en") {
      const english = tag.labels.en ?? tag.tag_id;
      return `${label} / ${english}`;
    }
    return label;
  };

  const toggleTag = (tagId: string) => {
    setForm((current) => {
      const selected = current.semantic_tag_ids.includes(tagId)
        ? current.semantic_tag_ids.filter((id) => id !== tagId)
        : [...current.semantic_tag_ids, tagId];

      return { ...current, semantic_tag_ids: selected };
    });
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    const current = form();
    if (!current.content.trim()) {
      setErrorMessage("Write something before posting.");
      return;
    }
    if (current.semantic_tag_ids.length === 0) {
      setErrorMessage("Choose at least one topic tag.");
      return;
    }
    if (!current.country) {
      setErrorMessage("Choose a country for the post scope.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: current.content.trim(),
        origin_lang: current.origin_lang,
        semantic_tag_ids: current.semantic_tag_ids,
        geo_scope: {
          country: current.country,
          region: current.region.trim() || undefined,
        },
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setErrorMessage("The post could not be created. Try again.");
      return;
    }

    notifyPostCreated();
    resetAndClose();
  };

  return (
    <Show when={composerOpen()}>
      <div class="modal-overlay" onClick={() => !submitting() && resetAndClose()}>
        <section class="post-dialog" onClick={(event) => event.stopPropagation()}>
          <header class="post-dialog-header">
            <div>
              <h2 class="post-dialog-title">New {t("common", "post")}</h2>
              <p class="post-dialog-subtitle">
                Share a multilingual topic with the global forum.
              </p>
            </div>

            <button
              type="button"
              class="icon-button"
              aria-label="Close post dialog"
              onClick={resetAndClose}
            >
              ✕
            </button>
          </header>

          <form class="post-form" onSubmit={handleSubmit}>
            <label class="form-field">
              <span class="form-label">Content</span>
              <textarea
                class="form-textarea"
                name="content"
                value={form().content}
                onInput={(event) => setField("content", event.currentTarget.value)}
                placeholder="Start the conversation..."
              />
            </label>

            <div class="form-grid">
              <label class="form-field">
                <span class="form-label">Original language</span>
                <select
                  class="form-select"
                  value={form().origin_lang}
                  onChange={(event) =>
                    setField("origin_lang", event.currentTarget.value as Locale)
                  }
                >
                  <For each={SUPPORTED_LOCALES}>
                    {(supportedLocale) => (
                      <option value={supportedLocale.code}>{supportedLocale.label}</option>
                    )}
                  </For>
                </select>
              </label>

              <label class="form-field">
                <span class="form-label">Country</span>
                <select
                  class="form-select"
                  value={form().country}
                  onChange={(event) => setField("country", event.currentTarget.value)}
                >
                  <option value="">Select country</option>
                  <For each={COUNTRY_OPTIONS}>
                    {(country) => (
                      <option value={country.code}>
                        {country.label} ({country.code})
                      </option>
                    )}
                  </For>
                </select>
              </label>
            </div>

            <label class="form-field">
              <span class="form-label">Region</span>
              <input
                class="form-input"
                type="text"
                value={form().region}
                onInput={(event) => setField("region", event.currentTarget.value)}
                placeholder="Optional city or region"
              />
            </label>

            <div class="form-field">
              <span class="form-label">Topic tags</span>
              <div class="tag-picker">
                <For each={tags() ?? []}>
                  {(tag) => {
                    const selected = () => form().semantic_tag_ids.includes(tag.tag_id);

                    return (
                      <label class={`tag-choice${selected() ? " selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={selected()}
                          onChange={() => toggleTag(tag.tag_id)}
                        />
                        <span>{resolveTagLabel(tag)}</span>
                      </label>
                    );
                  }}
                </For>
              </div>
            </div>

            <Show when={errorMessage()}>
              <p class="dialog-error">{errorMessage()}</p>
            </Show>

            <p class="dialog-footnote">
              Demo posts are stored in memory and reset when the dev server restarts.
            </p>

            <div class="dialog-actions">
              <button type="button" class="btn-secondary" onClick={resetAndClose}>
                Cancel
              </button>
              <button type="submit" class="btn-primary" disabled={submitting()}>
                {submitting() ? "Posting..." : `+ ${t("common", "post")}`}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Show>
  );
}