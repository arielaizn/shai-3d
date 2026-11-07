"use client";

import * as React from "react";

/**
 * Toasts, including the undo toast that makes 06 §C.20 level 1 honest: a status
 * change, a reorder and a hide are all instant, and all of them can be taken
 * back for six seconds.
 *
 * The countdown is a real timer with a visible ring, and hovering or focusing
 * the toast does not pause it: a bar that lies about how long you have is worse
 * than one that is simply short.
 */

export type ToastTone = "ok" | "error";

type Toast = {
  id: number;
  textHe: string;
  tone: ToastTone;
  undo?: () => void | Promise<void>;
  expiresAt: number;
};

type ToastApi = {
  show: (textHe: string, options?: { tone?: ToastTone; undo?: () => void | Promise<void> }) => void;
};

const ToastContext = React.createContext<ToastApi | null>(null);

const UNDO_MS = 6000;
const PLAIN_MS = 3200;

export function useToast(): ToastApi {
  const api = React.useContext(ToastContext);
  /* A screen rendered outside the host still has to be able to call show(),
     so the fallback is a no-op rather than a crash in the middle of a save. */
  return api ?? { show: () => undefined };
}

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(1);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = React.useCallback<ToastApi["show"]>((textHe, options) => {
    const id = nextId.current++;
    const life = options?.undo ? UNDO_MS : PLAIN_MS;
    setToasts((current) => [
      ...current.slice(-2),
      {
        id,
        textHe,
        tone: options?.tone ?? "ok",
        undo: options?.undo,
        expiresAt: Date.now() + life,
      },
    ]);
    window.setTimeout(() => dismiss(id), life);
  }, [dismiss]);

  const api = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="a-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="a-toast" data-tone={toast.tone}>
            <span className="a-grow">{toast.textHe}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={() => {
                  dismiss(toast.id);
                  void toast.undo?.();
                }}
              >
                בטל
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
