"use client";

/**
 * src/components/generator/StepPrice.tsx
 *
 * Step 6 · `מחיר`. The reveal, and the handoff.
 *
 * **It is its own step with its own URL.** RESOLUTIONS §ב.2: the price screen is a
 * destination, not a panel that slides in, because it is the thing the whole flow was
 * built to reach and because a visitor who shares the address in the middle of the
 * flow should be able to land back on it.
 *
 * **The number comes from the server.** `pricing.quote` computed it, the draft stored
 * it, and `leads.submit` recomputed it inside the mutation from the live channel
 * before writing the message. A price assembled in the browser is never stored and
 * never sent.
 *
 * **The WhatsApp button is an `<a href>` that is ready before it is touched.** Doc 04
 * §E4: creating the lead on the click and navigating after the `await` loses the user
 * gesture, and the Instagram in-app webview blocks it silently. So the lead is created
 * when this step opens, and the button is a link from the first paint.
 *
 * **No form.** RESOLUTIONS §ב.3: no name, no phone, no email. WhatsApp is the identity,
 * and a customer's phone number is not stored on a minor's system because a field
 * asked for it.
 */

import * as React from "react";

import { Button, ButtonInner, buttonPresentation } from "@/components/ui/Button";
import { WhatsAppGlyph } from "@/components/layout/WhatsAppLink";
import { GENERATOR } from "@/content/generator";
import { Skeleton } from "@/components/ui/Skeleton";
import { buildWaUrl } from "@/lib/whatsapp";

import { useGeneratorData } from "./data";
import { PriceBreakdown } from "./PriceBreakdown";
import { PriceTag } from "./PriceTag";
import { StepNote } from "./StepShell";
import { useGeneratorStore } from "./store";
import { colorsHe, fill, unitsHe, type QuoteState } from "./types";

/** `leads.submit` is rate limited to five an hour. Four is a deliberate margin. */
const MAX_LEAD_WRITES = 4;

export type StepPriceProps = {
  quote: QuoteState;
  printTypeNameHe: string;
  sizeLabelHe: string;
  colorNames: string[];
  quantity: number;
  /** Resets the configuration and keeps the photo. */
  onAgain: () => void;
};

export function StepPrice({
  quote,
  printTypeNameHe,
  sizeLabelHe,
  colorNames,
  quantity,
  onAgain,
}: StepPriceProps) {
  const { state, dispatch } = useGeneratorStore();
  const { createLead, online } = useGeneratorData();

  const [lead, setLead] = React.useState<{ whatsappUrl: string; offerUrl: string | null } | null>(
    null,
  );
  const [leadError, setLeadError] = React.useState<string | null>(null);
  const [handedOff, setHandedOff] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const writes = React.useRef(0);

  const ok = quote.status === "ok";
  const total = quote.status === "ok" ? quote.breakdown.totalAgorot : 0;

  /* DECISIONS.md: the number is assembled at call time in the browser, so it never
     sits in the served HTML for an address harvester to lift out. */
  React.useEffect(() => {
    setPhoneNumber(GENERATOR.handoff.desktop.number());
  }, []);

  const makeLead = React.useCallback(async (force = false) => {
    if (!online || !ok) return;
    if (!force && writes.current >= MAX_LEAD_WRITES) return;
    writes.current += 1;
    try {
      const result = await createLead();
      if (result) {
        setLead(result);
        setLeadError(null);
      }
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : "משהו השתבש. אפשר לנסות שוב");
    }
  }, [createLead, online, ok]);

  /* One write when the step opens on a valid quote, and one more after the note has
     settled, which is what carries an edited note into the message Shai receives. */
  const signature = `${total}|${state.noteHe}`;
  React.useEffect(() => {
    if (!ok) return;
    const timer = window.setTimeout(() => void makeLead(), lead === null ? 0 : 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ok]);

  const messageText = React.useMemo(() => {
    if (!lead) return "";
    try {
      return new URL(lead.whatsappUrl).searchParams.get("text") ?? "";
    } catch {
      return "";
    }
  }, [lead]);

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(message);
      window.setTimeout(() => setToast(null), 2600);
    } catch {
      setToast(GENERATOR.handoff.blockedToast);
    }
  }

  function onHandoff() {
    setHandedOff(true);
    // Doc 04 §E4: the app switch is sometimes swallowed inside an in-app browser.
    // If this document is still visible a second and a half later, it did not happen.
    window.setTimeout(() => {
      if (document.visibilityState === "visible") setBlocked(true);
    }, 1500);
  }

  if (quote.status === "loading") {
    return (
      <div className="flex flex-col gap-4 [min-inline-size:0]">
        <Skeleton variant="block" height="10rem" label="מחשב את המחיר" />
        <Skeleton variant="line" lines={3} />
      </div>
    );
  }

  if (quote.status === "invalid") {
    return (
      <StepNote tone="warning">
        <p>{quote.messageHe}</p>
      </StepNote>
    );
  }

  if (quote.status !== "ok") {
    /* No deployment behind the site: there is no price to show, and inventing one
       would be the one thing this site must never do. */
    return (
      <div className="flex flex-col gap-4 [min-inline-size:0]">
        <StepNote tone="play">
          <p>{GENERATOR.price.disclaimer[0]}</p>
        </StepNote>
        <a
          {...buttonPresentation({ variant: "accent", size: "lg", fullWidth: true })}
          href={buildWaUrl({ kind: "generic", source: "generator_price" })}
          target="_blank"
          rel="noopener noreferrer"
          data-wa="generator_price"
        >
          <ButtonInner state="idle" iconStart={<WhatsAppGlyph />}>
            {GENERATOR.price.primaryCta}
          </ButtonInner>
        </a>
      </div>
    );
  }

  const breakdown = quote.breakdown;

  return (
    <div className="flex flex-col gap-5 [min-inline-size:0]">
      <div
        className="flex flex-col items-center gap-4 [min-inline-size:0]"
        style={{
          backgroundColor: "var(--color-surface-raised)",
          borderRadius: "var(--radius-2xl)",
          borderWidth: "2px",
          borderStyle: "solid",
          borderColor: "var(--color-border-toy)",
          padding: "1.5rem 1.25rem",
          boxShadow: "0 18px 0 -6px color-mix(in oklab, var(--color-ink-900) 8%, transparent)",
        }}
      >
        <PriceTag agorot={total} ready />

        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          {GENERATOR.price.subline}
        </p>

        <p
          className="text-center [min-inline-size:0]"
          style={{ fontSize: "0.9375rem", color: "var(--color-text-primary)", lineHeight: 1.6 }}
        >
          <bdi>
            {fill(GENERATOR.price.configLine, {
              printType: printTypeNameHe,
              size: sizeLabelHe,
              colorsHe: colorsHe(colorNames.length),
              qtyHe: unitsHe(quantity),
            })}
          </bdi>
        </p>

        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          {GENERATOR.price.changeNote}
        </p>

        <div className="w-full [min-inline-size:0]">
          <PriceBreakdown lines={breakdown.lines} totalAgorot={total} />
        </div>
      </div>

      {/* The two honesty lines, 09c §6.10. They sit with the price, not in a footer. */}
      <div className="flex flex-col gap-1.5 [min-inline-size:0]">
        {GENERATOR.price.disclaimer.map((line) => (
          <p
            key={line}
            style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--color-text-secondary)" }}
          >
            {line}
          </p>
        ))}
      </div>

      {/* The note. 120 characters, and it travels into the WhatsApp message. */}
      <div className="flex flex-col gap-1.5 [min-inline-size:0]">
        <label
          htmlFor="generator-note"
          style={{ fontSize: "0.9375rem", fontWeight: 700 }}
        >
          {GENERATOR.price.noteLabel}
        </label>
        <textarea
          id="generator-note"
          value={state.noteHe}
          maxLength={GENERATOR.price.noteMaxChars}
          placeholder={GENERATOR.price.notePlaceholder}
          onChange={(event) => dispatch({ type: "setNote", noteHe: event.target.value })}
          rows={2}
          className="rounded-md [min-inline-size:0]"
          style={{
            padding: "0.625rem 0.75rem",
            backgroundColor: "var(--color-surface-raised)",
            borderWidth: "3px",
            borderStyle: "solid",
            borderColor: "var(--color-cream-300)",
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "var(--color-ink-900)",
            resize: "vertical",
          }}
        />
        <p
          aria-hidden="true"
          className="tabular-nums"
          style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}
        >
          <bdi>{fill(GENERATOR.price.noteCounter, { n: state.noteHe.length })}</bdi>
        </p>
      </div>

      {/* ------------------------------------------------------------ CTAs */}
      {lead ? (
        <a
          {...buttonPresentation({ variant: "accent", size: "lg", fullWidth: true })}
          href={lead.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-wa={GENERATOR.price.waSource}
          onClick={onHandoff}
        >
          <ButtonInner state="idle" iconStart={<WhatsAppGlyph />}>
            {GENERATOR.price.primaryCta}
          </ButtonInner>
        </a>
      ) : (
        <Button
          variant="accent"
          size="lg"
          fullWidth
          state={leadError ? "idle" : "loading"}
          busyLabel={GENERATOR.wait.aria}
          onClick={() => void makeLead(true)}
        >
          {GENERATOR.price.primaryCta}
        </Button>
      )}

      <p
        className="text-center"
        style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}
      >
        {GENERATOR.price.underCta}
      </p>

      {lead?.offerUrl ? (
        <Button
          variant="play"
          size="md"
          fullWidth
          onClick={() => void copy(lead.offerUrl as string, GENERATOR.price.savedToast)}
        >
          {GENERATOR.price.secondaryCta}
        </Button>
      ) : null}

      {leadError ? <StepNote tone="warning">{leadError}</StepNote> : null}

      {/* The desktop escape, 09c §6.11. */}
      <div className="hidden flex-col gap-2 sm:flex [min-inline-size:0]">
        <p style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
          {GENERATOR.handoff.desktop.title}
        </p>
        <div className="flex flex-wrap items-center gap-3 [min-inline-size:0]">
          <Button
            variant="ghost"
            size="sm"
            disabled={messageText.length === 0}
            onClick={() => void copy(messageText, GENERATOR.handoff.copiedToast)}
          >
            {GENERATOR.handoff.desktop.copy}
          </Button>
          {phoneNumber ? (
            <span className="tabular-nums" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
              <bdi dir="ltr">{phoneNumber}</bdi>
            </span>
          ) : null}
        </div>
      </div>

      {blocked ? (
        <StepNote
          tone="warning"
          actions={
            <Button
              variant="play"
              size="sm"
              disabled={messageText.length === 0}
              onClick={() => void copy(messageText, GENERATOR.handoff.copiedToast)}
            >
              {GENERATOR.handoff.desktop.copy}
            </Button>
          }
        >
          {GENERATOR.handoff.blockedToast}
        </StepNote>
      ) : null}

      {handedOff ? (
        <div
          className="flex flex-col gap-2 [min-inline-size:0]"
          style={{
            backgroundColor: "var(--color-success-soft)",
            borderRadius: "var(--radius-lg)",
            padding: "1rem",
          }}
        >
          <h2
            className="font-[family-name:var(--font-rubik)]"
            style={{ fontSize: "1.125rem", fontWeight: 800 }}
          >
            {GENERATOR.handoff.heading}
          </h2>
          <p style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>{GENERATOR.handoff.body}</p>
          {lead?.offerUrl ? (
            <a
              href={lead.offerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "var(--color-text-link)",
                textDecorationLine: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              {GENERATOR.handoff.linkLabel}
            </a>
          ) : null}
          <Button variant="ghost" size="sm" className="self-start" onClick={onAgain}>
            {GENERATOR.handoff.again}
          </Button>
        </div>
      ) : null}

      {toast ? (
        <p
          role="status"
          className="text-center"
          style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-turq-800)" }}
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
