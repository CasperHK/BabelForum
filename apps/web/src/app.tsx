import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { I18nProvider } from "~/context/i18n";
import PostComposer from "~/components/PostComposer";
import Navbar from "~/components/Navbar";
import { PostComposerProvider } from "~/context/post-composer";
import "./app.css";

export default function App() {
  return (
    <I18nProvider>
      <PostComposerProvider>
        <Router
          root={(props) => (
            <>
              <Navbar />
              <Suspense>{props.children}</Suspense>
              <PostComposer />
            </>
          )}
        >
          <FileRoutes />
        </Router>
      </PostComposerProvider>
    </I18nProvider>
  );
}
