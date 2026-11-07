"use server";

/**
 * src/components/contact/submitContactMessage.ts
 *
 * The only write this page makes.
 *
 * It is a server action rather than a `useMutation` call for two reasons. The site
 * has no `ConvexProvider` in its layout, and adding one would put a live websocket
 * on every route to serve one form. And a server action keeps the form working with
 * `useActionState`, so the pending state, the error state and the success state are
 * all real states of one submission instead of three booleans kept in sync by hand.
 *
 * The row lands in `contactMessages`, per the assignment and RESOLUTIONS §3. It is
 * NOT a lead: `leads.submit` now takes `{ sessionKey, noteHe? }` and belongs to the
 * generator, where a price and a draft already exist. A question typed on this page
 * has neither.
 *
 * Nothing here is trusted from the client except the four field values, and those
 * are validated twice more: once by `validateContact` below, and once inside the
 * mutation, which is the boundary that actually matters.
 */

import { ConvexError } from "convex/values";
import { fetchMutation } from "convex/nextjs";

import { api } from "../../../convex/_generated/api";
import { CONTACT } from "@/content/contact";

import type { ContactSubmitState } from "./state";
import {
  normaliseIsraeliPhone,
  validateContact,
  hasErrors,
  type ContactFieldErrors,
  type ContactValues,
} from "./validation";

const ERRORS = CONTACT.form.errors;

/** `FormData.get` returns `File | string | null`; only a string is ever wanted here. */
function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * The mutation's own error codes, mapped back onto the fields they came from so a
 * rejection from Convex lands under the input that caused it rather than in a
 * generic banner. `RATE_LIMITED` deliberately does not use the Convex string: it
 * says "try again in a minute" while the window is an hour, and the honest answer
 * for someone who has already sent three messages is the WhatsApp line, which is
 * exactly what the locked screen level error offers.
 */
function fieldErrorFromCode(code: unknown): ContactFieldErrors | null {
  switch (code) {
    case "BAD_NAME":
      return { name: ERRORS.name.short };
    case "BAD_PHONE":
      return { phone: ERRORS.phone.invalid };
    case "BAD_EMAIL":
      return { email: ERRORS.email.invalid };
    case "BAD_BODY":
      return { message: ERRORS.message.short };
    case "TOO_LONG":
      return { message: ERRORS.message.long };
    default:
      return null;
  }
}

function convexErrorCode(error: unknown): unknown {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "object" && data !== null && "code" in data) {
      return (data as { code: unknown }).code;
    }
    return null;
  }
  return null;
}

export async function submitContactMessage(
  previous: ContactSubmitState,
  form: FormData,
): Promise<ContactSubmitState> {
  const attempt = previous.attempt + 1;

  const values: ContactValues = {
    name: text(form, "name"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    message: text(form, "message"),
  };

  const fieldErrors = validateContact(values);
  if (hasErrors(fieldErrors)) {
    return { status: "invalid", attempt, fieldErrors };
  }

  const name = values.name.trim();
  const message = values.message.trim();
  const email = values.email.trim();
  const sessionKey = text(form, "sessionKey").trim();

  /**
   * A missing deployment URL is a build that was never connected to Convex. It
   * throws inside `fetchMutation` with a message meant for a developer, so it is
   * caught here and answered with the sentence a visitor can act on.
   */
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return { status: "failed", attempt, formError: ERRORS.submit };
  }

  try {
    await fetchMutation(api.contact.send, {
      name,
      phone: normaliseIsraeliPhone(values.phone.trim()),
      email: email.length > 0 ? email : undefined,
      bodyHe: message,
      sessionKey: sessionKey.length > 0 ? sessionKey : undefined,
    });
  } catch (error) {
    const mapped = fieldErrorFromCode(convexErrorCode(error));
    if (mapped) {
      return { status: "failed", attempt, formError: ERRORS.submit, fieldErrors: mapped };
    }
    return { status: "failed", attempt, formError: ERRORS.submit };
  }

  return { status: "sent", attempt, nameHe: name, messageHe: message };
}
