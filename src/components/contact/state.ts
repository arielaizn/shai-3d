/**
 * src/components/contact/state.ts
 *
 * The value `useActionState` passes back and forth between the form and the server
 * action. It lives in its own module because a `"use server"` file may only export
 * async functions, and because both sides have to agree on the shape exactly.
 *
 * `attempt` counts submissions rather than describing them. It is used as the React
 * key on the screen level error, so a second identical failure re-inserts the
 * `role="alert"` node and is announced again. Without it a visitor who presses the
 * button twice with no network hears the failure once.
 */

import type { ContactFieldErrors } from "./validation";

export type ContactSubmitState =
  /** Nothing has been sent yet. */
  | { status: "idle"; attempt: 0 }
  /** The values did not pass. Field errors sit under their own fields. */
  | { status: "invalid"; attempt: number; fieldErrors: ContactFieldErrors }
  /** The values passed and the write did not happen. */
  | { status: "failed"; attempt: number; formError: string; fieldErrors?: ContactFieldErrors }
  /** Written. The two values the WhatsApp handoff needs are carried back. */
  | { status: "sent"; attempt: number; nameHe: string; messageHe: string };

export const INITIAL_CONTACT_STATE: ContactSubmitState = { status: "idle", attempt: 0 };
