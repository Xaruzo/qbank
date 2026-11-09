/// <reference types="vite/client" />

interface Window {
  storage?: {
    get: (key: string) => Promise<{ value?: string } | null | undefined>;
    set: (key: string, value: string) => Promise<void>;
  };
}
