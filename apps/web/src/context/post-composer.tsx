import {
  createContext,
  createSignal,
  useContext,
  type ParentComponent,
} from "solid-js";

interface PostComposerContextValue {
  composerOpen: () => boolean;
  openComposer: () => void;
  closeComposer: () => void;
  postsVersion: () => number;
  notifyPostCreated: () => void;
}

const PostComposerContext = createContext<PostComposerContextValue>();

export const PostComposerProvider: ParentComponent = (props) => {
  const [composerOpen, setComposerOpen] = createSignal(false);
  const [postsVersion, setPostsVersion] = createSignal(0);

  const value: PostComposerContextValue = {
    composerOpen,
    openComposer: () => setComposerOpen(true),
    closeComposer: () => setComposerOpen(false),
    postsVersion,
    notifyPostCreated: () => setPostsVersion((value) => value + 1),
  };

  return (
    <PostComposerContext.Provider value={value}>
      {props.children}
    </PostComposerContext.Provider>
  );
};

export function usePostComposer(): PostComposerContextValue {
  const context = useContext(PostComposerContext);
  if (!context) {
    throw new Error("usePostComposer() must be used inside <PostComposerProvider>");
  }
  return context;
}