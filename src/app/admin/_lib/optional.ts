"use client";

import * as React from "react";
import { useConvex } from "convex/react";
import { makeFunctionReference } from "convex/server";

/**
 * Calling a Convex function that the generated `api` object does not know about.
 *
 * Two different situations need this, and both are real in this repository right
 * now:
 *
 * 1. `convex/pricing.ts` EXISTS and exports `publicConfig`, `quote` and
 *    `fromPrices`, but `convex/_generated/api.d.ts` was generated before that
 *    module landed and does not list it. `api.pricing` is therefore a type error
 *    while `pricing:publicConfig` is a perfectly good function on the deployment.
 *    Regenerating that file is `npx convex dev`'s job and not a screen's.
 *
 * 2. Parts of 06 PART C are specified against modules that have not been written
 *    yet (`pricing.updateDraft`, `pricing.publish`, `home.*`). A screen that
 *    imported them would not compile, and a screen that pretended they existed
 *    would throw a red React error in a thirteen year old's face.
 *
 * So: address the function by name, ask for it once, and let the screen render a
 * calm Hebrew sentence when the answer is "there is no such function". The panel
 * degrades to what the backend can actually do instead of crashing, and the day
 * the function lands the same screen starts using it with no edit.
 */

export type Optional<T> =
  | { status: "loading" }
  /** the deployment has no such function yet */
  | { status: "absent" }
  | { status: "failed"; messageHe: string }
  | { status: "ready"; data: T };

/** Convex answers a missing function with a message, not a typed error code. */
function isAbsent(error: unknown): boolean {
  const text =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /could not find (public )?function|function not found|no such function/i.test(
    text,
  );
}

function messageOf(error: unknown): string {
  const data = (error as { data?: unknown })?.data;
  if (data && typeof data === "object" && "he" in data) {
    const he = (data as { he?: unknown }).he;
    if (typeof he === "string" && he.length > 0) return he;
  }
  return "לא הצלחתי לקרוא את הנתונים. אפשר לרענן את העמוד";
}

export class PanelError extends Error {
  data: { code: string; he: string };
  constructor(code: string, he: string) {
    super(he);
    this.data = { code, he };
  }
}

/**
 * A one-shot read. It is deliberately not reactive: every screen that uses it
 * reads configuration a person changes on purpose, never a live inbox, and a
 * websocket subscription to a function that may not exist is not a thing to
 * arrange. `reload` re-runs it after a write.
 */
export function useOptionalQuery<T>(
  name: string,
  args: Record<string, unknown> | "skip",
): [Optional<T>, () => void] {
  const convex = useConvex();
  const [token, setToken] = React.useState(0);
  const [state, setState] = React.useState<Optional<T>>({ status: "loading" });
  const key = args === "skip" ? "skip" : JSON.stringify(args);

  React.useEffect(() => {
    if (key === "skip") return;
    let cancelled = false;
    setState({ status: "loading" });
    const reference = makeFunctionReference<"query">(name);
    convex
      .query(reference, JSON.parse(key) as Record<string, unknown>)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data: data as T });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState(
          isAbsent(error)
            ? { status: "absent" }
            : { status: "failed", messageHe: messageOf(error) },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [convex, name, key, token]);

  const reload = React.useCallback(() => setToken((value) => value + 1), []);
  return [state, reload];
}

/**
 * The write half. Throws a `PanelError` carrying a Hebrew sentence when the
 * function is not on the deployment, which `errorHe` already knows how to read,
 * so a save button behaves the same way it does for any other refusal.
 */
export function useOptionalMutation(
  name: string,
  absentHe: string,
): (args: Record<string, unknown>) => Promise<unknown> {
  const convex = useConvex();
  return React.useCallback(
    async (args: Record<string, unknown>) => {
      try {
        return await convex.mutation(makeFunctionReference<"mutation">(name), args);
      } catch (error) {
        if (isAbsent(error)) throw new PanelError("NOT_DEPLOYED", absentHe);
        throw error;
      }
    },
    [convex, name, absentHe],
  );
}
