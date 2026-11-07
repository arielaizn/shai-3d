"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";
import { CONTACT } from "@/content/contact";
import type { WaMessageConfig } from "@/lib/whatsapp";

import { Card, CardHeading } from "./Card";
import { ContactFormSuccess } from "./ContactFormSuccess";
import { Field } from "./Field";
import { readSessionKey } from "./sessionKey";
import { submitContactMessage } from "./submitContactMessage";
import { INITIAL_CONTACT_STATE } from "./state";
import {
  emptyContactValues,
  firstInvalidField,
  hasErrors,
  validateContact,
  validateField,
  type ContactFieldErrors,
  type ContactFieldName,
  type ContactValues,
} from "./validation";

/**
 * The second way to reach Shai, doc 03 §6.3.
 *
 * It is a form and not a gate. RESOLUTIONS §3 removed every field from the path
 * between a price and WhatsApp; what is left here is for the person who will not
 * open WhatsApp at all, typically a parent on a work computer, and it sits beside
 * the WhatsApp card rather than in front of it.
 *
 * **Why a server action.** The site has no `ConvexProvider`, and mounting one in the
 * layout would open a websocket on every route to serve one form. `useActionState`
 * gives the three states this form actually has, as one value: idle, pending, and a
 * result. Nothing is kept in sync by hand, and the form still submits with
 * JavaScript disabled, in which case the action's own validation is what answers.
 *
 * **Why `onSubmit` may cancel the action.** React only dispatches a form action if
 * the submit event was not default-prevented, so the client validation below runs
 * first and stops the round trip when a field is wrong. That is what lets an error
 * appear instantly on a slow connection instead of after a network wait.
 *
 * **Focus.** Two moves, and no others. A failed submit focuses the first field
 * holding an error. A successful one focuses the success heading, which is inside
 * the panel that replaced this form.
 */

const HEADING_ID = "contact-form-heading";

const FIELD_IDS: Record<ContactFieldName, string> = {
  name: "contact-name",
  phone: "contact-phone",
  email: "contact-email",
  message: "contact-message",
};

/**
 * The controls are looked up by id rather than through four forwarded refs. `Field`
 * owns its own markup and the ids above are the same ids it renders, so this is the
 * shortest path from "which field is wrong" to "put the cursor in it" that does not
 * thread a ref object through two components.
 */
function focusField(field: ContactFieldName): void {
  const node = document.getElementById(FIELD_IDS[field]);
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    node.focus();
  }
}

export function ContactForm() {
  const [state, formAction, pending] = React.useActionState(
    submitContactMessage,
    INITIAL_CONTACT_STATE,
  );

  const [values, setValues] = React.useState<ContactValues>(emptyContactValues);
  const [fieldErrors, setFieldErrors] = React.useState<ContactFieldErrors>({});
  const [sessionKey, setSessionKey] = React.useState("");

  // DECISIONS.md: the session key is read from the browser, never rendered on the
  // server. Until this lands the hidden input is empty and the mutation falls back
  // to its global rate limit, which is the correct behaviour, not a broken one.
  React.useEffect(() => {
    setSessionKey(readSessionKey());
  }, []);

  /**
   * A result that carries field errors came from the action, which only happens
   * when the browser skipped the client pass (no JavaScript) or when Convex
   * disagreed with the mirrored rules in `validation.ts`. Either way the errors
   * belong under their fields, and the first one takes focus exactly as it does on
   * a client side failure.
   */
  const seenAttempt = React.useRef(0);
  React.useEffect(() => {
    if (state.attempt === seenAttempt.current) return;
    seenAttempt.current = state.attempt;

    const incoming =
      state.status === "invalid"
        ? state.fieldErrors
        : state.status === "failed"
          ? state.fieldErrors
          : undefined;
    if (!incoming) return;

    setFieldErrors((previous) => ({ ...previous, ...incoming }));
    const first = firstInvalidField(incoming);
    if (first) focusField(first);
  }, [state]);

  function setValue(field: ContactFieldName, value: string): void {
    setValues((previous) => ({ ...previous, [field]: value }));
    // Doc 07 §8: an error is cleared while the visitor is fixing it, never re-run
    // on every keystroke. Being told the address is incomplete after four
    // characters of typing it is the definition of a form that nags.
    setFieldErrors((previous) => {
      if (previous[field] === undefined) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function handleBlur(field: ContactFieldName): void {
    const message = validateField(field, values[field]);
    setFieldErrors((previous) => {
      const next = { ...previous };
      if (message === undefined) delete next[field];
      else next[field] = message;
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    const errors = validateContact(values);
    if (!hasErrors(errors)) return;

    // React reads `defaultPrevented` before it dispatches the action, so this is
    // what stops the submission rather than a flag the action has to check.
    event.preventDefault();
    setFieldErrors(errors);
    const first = firstInvalidField(errors);
    if (first) focusField(first);
  }

  if (state.status === "sent") {
    return (
      <Card id="contact-form" style={{ scrollMarginBlockStart: "6rem" }}>
        <ContactFormSuccess
          nameHe={state.nameHe}
          messageHe={state.messageHe}
          headingId={HEADING_ID}
        />
      </Card>
    );
  }

  const formError = state.status === "failed" ? state.formError : undefined;

  /**
   * The escape hatch beside the button carries whatever has been typed so far, so
   * a visitor who gives up on the form mid-way arrives in WhatsApp with their own
   * sentence already written. With nothing typed it is the plain opener.
   */
  const altConfig: WaMessageConfig =
    values.name.trim().length > 0 && values.message.trim().length > 0
      ? { kind: "contact_form", nameHe: values.name.trim(), messageHe: values.message.trim() }
      : { kind: "generic" };

  return (
    <Card id="contact-form" style={{ scrollMarginBlockStart: "6rem" }}>
      <CardHeading id={HEADING_ID}>{CONTACT.form.heading}</CardHeading>

      <form
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 flex flex-col gap-5 [min-inline-size:0]"
      >
        <input type="hidden" name="sessionKey" value={sessionKey} />

        <Field
          id={FIELD_IDS.name}
          name="name"
          label={CONTACT.form.fields.name.label}
          placeholder={CONTACT.form.fields.name.placeholder}
          autoComplete="name"
          required
          value={values.name}
          error={fieldErrors.name}
          onValueChange={(value) => setValue("name", value)}
          onBlur={() => handleBlur("name")}
        />

        <Field
          id={FIELD_IDS.phone}
          name="phone"
          type="tel"
          inputMode="tel"
          direction="ltr"
          label={CONTACT.form.fields.phone.label}
          placeholder={CONTACT.form.fields.phone.placeholder}
          autoComplete="tel"
          required
          value={values.phone}
          error={fieldErrors.phone}
          onValueChange={(value) => setValue("phone", value)}
          onBlur={() => handleBlur("phone")}
        />

        <Field
          id={FIELD_IDS.email}
          name="email"
          type="email"
          inputMode="email"
          direction="ltr"
          label={CONTACT.form.fields.email.label}
          placeholder={CONTACT.form.fields.email.placeholder}
          autoComplete="email"
          value={values.email}
          error={fieldErrors.email}
          onValueChange={(value) => setValue("email", value)}
          onBlur={() => handleBlur("email")}
        />

        <Field
          multiline
          id={FIELD_IDS.message}
          name="message"
          label={CONTACT.form.fields.message.label}
          placeholder={CONTACT.form.fields.message.placeholder}
          required
          value={values.message}
          error={fieldErrors.message}
          onValueChange={(value) => setValue("message", value)}
          onBlur={() => handleBlur("message")}
        />

        {formError ? (
          // keyed by attempt so a second identical failure is a new node, which is
          // what makes an alert announce twice
          <p
            key={state.attempt}
            role="alert"
            className="[min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "0.9375rem",
              fontWeight: 600,
              lineHeight: 1.6,
              color: "var(--color-text-primary)",
              backgroundColor: "color-mix(in oklab, var(--color-red-500) 12%, transparent)",
              borderRadius: "var(--radius-sm)",
              paddingInline: "0.875rem",
              paddingBlock: "0.625rem",
            }}
          >
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center [min-inline-size:0]">
          <Button
            type="submit"
            variant="ink"
            size="lg"
            state={pending ? "loading" : "idle"}
            busyLabel={CONTACT.form.submitPending}
            className="sm:w-auto"
          >
            {CONTACT.form.submit}
          </Button>

          <WhatsAppLink
            config={altConfig}
            source={CONTACT.channels.whatsapp.waSource}
            variant="ghost"
            size="lg"
            iconStart={<WhatsAppGlyph />}
          >
            {CONTACT.form.altCta}
          </WhatsAppLink>
        </div>

        <p
          className="[min-inline-size:0]"
          style={{
            fontFamily: "var(--font-assistant), system-ui, sans-serif",
            fontSize: "0.8125rem",
            lineHeight: 1.6,
            color: "var(--color-text-muted)",
            maxInlineSize: "44ch",
          }}
        >
          {CONTACT.form.privacy}
        </p>
      </form>
    </Card>
  );
}
