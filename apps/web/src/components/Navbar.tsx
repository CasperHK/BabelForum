import { For, createSignal } from "solid-js";
import { useI18n, SUPPORTED_LOCALES, type Locale } from "~/context/i18n";
import { usePostComposer } from "~/context/post-composer";

export default function Navbar() {
  const { locale, setLocale, t, bilingual, toggleBilingual } = useI18n();
  const { openComposer } = usePostComposer();
  const [open, setOpen] = createSignal(false);

  return (
    <nav class="navbar">
      {/* Brand */}
      <a href="/" class="navbar-brand">
        🗼 Babel Forum
      </a>

      {/* Right controls */}
      <div class="navbar-controls">
        {/* Bilingual toggle */}
        <button
          type="button"
          class={`bilingual-toggle${bilingual() ? " active" : ""}`}
          onClick={toggleBilingual}
          title="Toggle bilingual mode — show labels in both current language and English"
        >
          {bilingual() ? "雙語 / Bilingual ✓" : "雙語 / Bilingual"}
        </button>

        {/* Language switcher dropdown */}
        <div class="lang-switcher">
          <button
            type="button"
            class="lang-btn"
            onClick={() => setOpen((v) => !v)}
          >
            {SUPPORTED_LOCALES.find((l) => l.code === locale())?.label ?? locale()}
            <span class="caret">{open() ? "▲" : "▼"}</span>
          </button>

          {open() && (
            <ul class="lang-dropdown">
              <For each={SUPPORTED_LOCALES}>
                {(loc) => (
                  <li>
                    <button
                      type="button"
                      class={`lang-option${locale() === loc.code ? " selected" : ""}`}
                      onClick={() => {
                        setLocale(loc.code as Locale);
                        setOpen(false);
                      }}
                    >
                      {loc.label}
                    </button>
                  </li>
                )}
              </For>
            </ul>
          )}
        </div>

        {/* Post CTA */}
        <button type="button" class="btn-primary" onClick={openComposer}>
          + {t("common", "post")}
        </button>
      </div>
    </nav>
  );
}
