/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TABBY_PROJECT_ROOT?: string;
  readonly VITE_TABBY_PROJECT_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
