// /// <reference types="vite/client" />

// Manually define types for import.meta.env as a workaround if 'vite/client' resolution fails.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string; // Made optional to align with usage in apiClient.ts
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// If you have other global type declarations, they can remain here.