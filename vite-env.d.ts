/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DATA_SOURCE: string;
  readonly VITE_ENABLE_MOCK_DATA: string;
  readonly VITE_CACHE_TTL: string;
  readonly VITE_MAX_VEHICLE_DISPLAY: string;
  readonly VITE_FLOW3_URL: string;
  readonly VITE_AZURE_FUNCTION_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
