/** Глобальные доп. поля для браузерного редактора (checkJs). */
export {};

declare global {
  var __SCRATCH_E2E_SUPPRESS_CONNECTOR__: boolean | undefined;
  var __SCRATCH_CALL_HISTORY__:
    | Array<{ t: number; tag: string; detail: unknown }>
    | undefined;

  interface Window {
    __DEBUG__?: boolean;
    enableConnectorDebug?: () => void;
    disableConnectorDebug?: () => void;
    __SCRATCH_getBlockLinkSnapshot?: () => Record<
      string,
      {
        blockUUID: string;
        blockKey: string;
        type: string;
        parentUUID: string | null;
        nextUUID: string | null;
        innerStackHeadUUID: string | null;
        topLevel: boolean;
      }
    >;
    __SCRATCH_resetCallHistory?: () => void;
  }

  interface Event {
    /** Кастомные события grab-* и др. */
    readonly detail?: any;
  }
}
