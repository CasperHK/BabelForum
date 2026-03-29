import {
  createContext,
  createSignal,
  useContext,
  type ParentComponent,
} from "solid-js";
import { isServer } from "solid-js/web";
import { type } from "arktype";
import { DictionarySchema, type Dictionary } from "@babel-forum/shared";

// ---------------------------------------------------------------------------
// Supported locales
// ---------------------------------------------------------------------------
export type Locale = "en" | "zh-TW" | "ja";

export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ja", label: "日本語" },
];

// ---------------------------------------------------------------------------
// Translation dictionaries — typed as Dictionary so TypeScript enforces
// that every key defined in DictionarySchema is present.
// ---------------------------------------------------------------------------
const dictionaries: Record<Locale, Dictionary> = {
  en: {
    common: {
      search: "Search",
      filter: "Filter",
      post: "Post",
      translate: "Translate",
    },
    filters: {
      topic: "Topic",
      language: "Language",
      region: "Region",
      country: "Country",
    },
  },
  "zh-TW": {
    common: {
      search: "搜尋",
      filter: "篩選",
      post: "發文",
      translate: "翻譯",
    },
    filters: {
      topic: "主題",
      language: "語言",
      region: "地區",
      country: "國家",
    },
  },
  ja: {
    common: {
      search: "検索",
      filter: "フィルター",
      post: "投稿",
      translate: "翻訳",
    },
    filters: {
      topic: "トピック",
      language: "言語",
      region: "地域",
      country: "国",
    },
  },
};

// Runtime validation: each dictionary must satisfy DictionarySchema.
// Uses ArkType's type.errors to detect schema mismatches at module init.
for (const [locale, dict] of Object.entries(dictionaries)) {
  const result = DictionarySchema(dict);
  if (result instanceof type.errors) {
    throw new Error(
      `[i18n] Dictionary for "${locale}" failed schema validation:\n${result.summary}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Auto-detect locale from browser or fall back to "en"
// ---------------------------------------------------------------------------
function detectLocale(): Locale {
  if (isServer) return "en";
  const lang = navigator.language; // e.g. "zh-TW", "en-US", "ja"
  for (const { code } of SUPPORTED_LOCALES) {
    if (lang === code || lang.startsWith(code.split("-")[0])) return code;
  }
  return "en";
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
type Section = keyof Dictionary;
type KeyOf<S extends Section> = keyof Dictionary[S] & string;

interface I18nContextValue {
  /** Reactive current locale signal */
  locale: () => Locale;
  /** Switch the active locale */
  setLocale: (locale: Locale) => void;
  /**
   * Translate a key. Sections and keys are fully typed via DictionarySchema.
   * Usage: t("common", "search") → "Search" | "搜尋" | "検索"
   */
  t: <S extends Section>(section: S, key: KeyOf<S>) => string;
  /**
   * When true, every translated string is rendered alongside English,
   * e.g. "搜尋 / Search". Perfect for language-learning scenarios.
   */
  bilingual: () => boolean;
  toggleBilingual: () => void;
}

// ---------------------------------------------------------------------------
// Context + Provider
// ---------------------------------------------------------------------------
const I18nContext = createContext<I18nContextValue>();

export const I18nProvider: ParentComponent = (props) => {
  const [locale, setLocale] = createSignal<Locale>(detectLocale());
  const [bilingual, setBilingual] = createSignal(false);

  const t = <S extends Section>(section: S, key: KeyOf<S>): string => {
    const value =
      (dictionaries[locale()][section] as Record<string, string>)[key] ?? key;

    // Bilingual mode: append English alongside current locale text
    if (bilingual() && locale() !== "en") {
      const en =
        (dictionaries["en"][section] as Record<string, string>)[key] ?? key;
      return `${value} / ${en}`;
    }

    return value;
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        bilingual,
        toggleBilingual: () => setBilingual((v) => !v),
      }}
    >
      {props.children}
    </I18nContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook — throws a clear error if used outside the provider
// ---------------------------------------------------------------------------
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n() must be used inside <I18nProvider>");
  return ctx;
}
