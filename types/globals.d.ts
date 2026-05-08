/** Глобальные доп. поля для браузерного редактора (checkJs). */
export {};

declare global {
  interface Window {
    __DEBUG__?: boolean;
    enableConnectorDebug?: () => void;
    disableConnectorDebug?: () => void;
  }

  interface Event {
    /** Кастомные события grab-* и др. */
    readonly detail?: any;
  }
}
