/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the STMS app. Visitors continue here from the landing page. */
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
