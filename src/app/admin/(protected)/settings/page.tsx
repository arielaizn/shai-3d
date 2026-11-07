"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { AccountCard } from "@/app/admin/_components/AccountCard";
import { api, type Doc } from "@/app/admin/_lib/convex";
import { ConfirmTypeToName } from "@/components/admin/Dialogs";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import { errorHe, V } from "@/components/admin/messages";
import { useToast } from "@/components/admin/Toast";
import { formatIsraeliPhone } from "@/components/ui/Bidi";
import {
  ActionButton,
  Card,
  HelpNote,
  LoadingBlock,
  Note,
  NumberStepper,
  PageHeader,
  TextAreaField,
  TextField,
  Toggle,
} from "@/components/admin/ui";

/**
 * הגדרות, 06 §C.17. Explicit save per card, so a wrong tap in one group cannot
 * ruin another.
 *
 * Two fields are guarded harder than the rest, and both for the same reason: they
 * can take the business off the air.
 *
 *   the WhatsApp number IS the business (DECISIONS). Changing it sends every new
 *   lead to a stranger, so it is owner only in the mutation and needs the new
 *   number typed twice here.
 *   maintenance mode replaces the public site with one card, so turning it on
 *   needs the word סגור typed out. 06 §C.20 level 4.
 */

type Settings = Doc<"siteSettings">;

type Form = {
  businessNameHe: string;
  taglineHe: string;
  contactEmail: string;
  instagramUrl: string;
  tiktokUrl: string;
  whatsappNumberE164: string;
  whatsappGreetingHe: string;
  turnaroundDaysMin: number;
  turnaroundDaysMax: number;
  pickupCityHe: string;
  announcementEnabled: boolean;
  announcementTextHe: string;
  announcementHref: string;
  maintenanceMode: boolean;
  maintenanceTextHe: string;
  notifyEmail: string;
  notifyWhatsapp: string;
  internalNotesHe: string;
};

function toForm(row: Settings): Form {
  return {
    businessNameHe: row.businessNameHe,
    taglineHe: row.taglineHe,
    contactEmail: row.contactEmail ?? "",
    instagramUrl: row.instagramUrl ?? "",
    tiktokUrl: row.tiktokUrl ?? "",
    whatsappNumberE164: row.whatsappNumberE164,
    whatsappGreetingHe: row.whatsappGreetingHe,
    turnaroundDaysMin: row.turnaroundDaysMin,
    turnaroundDaysMax: row.turnaroundDaysMax,
    pickupCityHe: row.pickupCityHe,
    announcementEnabled: row.announcementEnabled,
    announcementTextHe: row.announcementTextHe ?? "",
    announcementHref: row.announcementHref ?? "",
    maintenanceMode: row.maintenanceMode,
    maintenanceTextHe: row.maintenanceTextHe ?? "",
    notifyEmail: row.notifyEmail ?? "",
    notifyWhatsapp: row.notifyWhatsapp ?? "",
    internalNotesHe: row.internalNotesHe ?? "",
  };
}

export default function SettingsPage() {
  const settings = useQuery(api.settings.get, {});
  const update = useMutation(api.settings.update);
  const toast = useToast();

  const [form, setForm] = React.useState<Form | null>(null);
  const [numberOpen, setNumberOpen] = React.useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = React.useState(false);

  const baseline = React.useMemo(() => (settings ? toForm(settings) : null), [settings]);

  React.useEffect(() => {
    if (baseline && form === null) setForm(baseline);
  }, [baseline, form]);

  if (settings === undefined) return <LoadingBlock rows={4} />;
  if (settings === null || !form || !baseline) {
    return (
      <>
        <PageHeader title="הגדרות" />
        <Card>
          <p className="a-muted">
            ההגדרות עוד לא נוצרו. הן נכתבות בזריעה של השרת, יחד עם המחירון וסוגי ההדפסה.
          </p>
        </Card>
      </>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const dirtyIn = (keys: (keyof Form)[]) =>
    keys.some((key) => JSON.stringify(form[key]) !== JSON.stringify(baseline[key]));

  async function saveCard(keys: (keyof Form)[]) {
    if (!form) return;
    const patch: Record<string, unknown> = {};
    for (const key of keys) patch[key] = form[key];
    try {
      await update({ patch: patch as Parameters<typeof update>[0]["patch"] });
      toast.show(V.saved);
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    }
  }

  function CardSave({ keys }: { keys: (keyof Form)[] }) {
    const dirty = dirtyIn(keys);
    return (
      <div className="a-row" style={{ marginBlockStart: "0.75rem" }}>
        <ActionButton tone="primary" disabled={!dirty} onClick={() => void saveCard(keys)}>
          לשמור
        </ActionButton>
        {dirty ? <span className="a-dirty">לא נשמר</span> : null}
      </div>
    );
  }

  const greetingPreview = [
    form.whatsappGreetingHe,
    "",
    "מה: ליתופן",
    "גודל: בינוני",
    "כמות: 1",
    "מחיר באתר: 120 שקל",
  ].join("\n");

  return (
    <>
      <PageHeader title="הגדרות" helpHe="כל קבוצה נשמרת בנפרד." />

      <div className="a-stack">
        <Card title="פרטי העסק">
          <div className="a-fields" data-cols="2">
            <TextField
              label="שם"
              value={form.businessNameHe}
              onChange={(value) => set("businessNameHe", value)}
              maxLength={40}
            />
            <TextField
              label="משפט המותג"
              value={form.taglineHe}
              onChange={(value) => set("taglineHe", value)}
              maxLength={60}
            />
            <TextField
              label="מייל"
              type="email"
              dir="ltr"
              value={form.contactEmail}
              onChange={(value) => set("contactEmail", value)}
            />
            <TextField
              label="אינסטגרם"
              type="url"
              dir="ltr"
              value={form.instagramUrl}
              onChange={(value) => set("instagramUrl", value)}
            />
            <TextField
              label="טיקטוק"
              type="url"
              dir="ltr"
              value={form.tiktokUrl}
              onChange={(value) => set("tiktokUrl", value)}
            />
          </div>
          <CardSave
            keys={["businessNameHe", "taglineHe", "contactEmail", "instagramUrl", "tiktokUrl"]}
          />
        </Card>

        <Card title="וואטסאפ" helpHe="לשם מגיעה כל הזמנה מהאתר.">
          <div className="a-stack">
            <p className="a-num">
              המספר עכשיו: <bdi dir="ltr">{formatIsraeliPhone(settings.whatsappNumberE164)}</bdi>
            </p>
            <TextField
              label="מספר חדש"
              hint="בפורמט בינלאומי בלי פלוס. לדוגמה 972585845083"
              dir="ltr"
              inputMode="numeric"
              value={form.whatsappNumberE164}
              onChange={(value) => set("whatsappNumberE164", value)}
            />
            {form.whatsappNumberE164 !== baseline.whatsappNumberE164 ? (
              <>
                <Note tone="danger">שינוי המספר ישלח את כל הפניות החדשות למספר אחר.</Note>
                <ActionButton tone="danger" onClick={() => setNumberOpen(true)}>
                  להחליף מספר
                </ActionButton>
              </>
            ) : null}

            <TextAreaField
              label="שורת הפתיחה של ההודעה"
              hint="זאת השורה הראשונה בהודעה שהלקוח שולח לך"
              value={form.whatsappGreetingHe}
              onChange={(value) => set("whatsappGreetingHe", value)}
              rows={2}
              maxLength={120}
            />
            <blockquote className="a-quote" style={{ whiteSpace: "pre-line" }}>
              {greetingPreview}
            </blockquote>
            <CardSave keys={["whatsappGreetingHe"]} />
          </div>
        </Card>

        <Card title="זמני אספקה" helpHe="המספרים האלה מופיעים בדף הבית, בכל מוצר ובשאלות ותשובות.">
          <div className="a-row" style={{ flexWrap: "wrap" }}>
            <NumberStepper
              label="מינימום ימי עבודה"
              value={form.turnaroundDaysMin}
              min={1}
              max={30}
              onChange={(value) => set("turnaroundDaysMin", value)}
            />
            <NumberStepper
              label="מקסימום ימי עבודה"
              value={form.turnaroundDaysMax}
              min={1}
              max={60}
              onChange={(value) => set("turnaroundDaysMax", value)}
            />
          </div>
          <div style={{ marginBlockStart: "0.75rem", maxInlineSize: "18rem" }}>
            <TextField
              label="עיר לאיסוף עצמי"
              value={form.pickupCityHe}
              onChange={(value) => set("pickupCityHe", value)}
            />
          </div>
          <CardSave keys={["turnaroundDaysMin", "turnaroundDaysMax", "pickupCityHe"]} />
        </Card>

        <Card title="רצועת הודעה" helpHe="פס דק בראש האתר. טוב לחופשה או למבצע.">
          <div className="a-stack">
            <Toggle
              label="מוצגת"
              checked={form.announcementEnabled}
              onChange={(value) => set("announcementEnabled", value)}
            />
            <TextField
              label="הטקסט"
              value={form.announcementTextHe}
              onChange={(value) => set("announcementTextHe", value)}
              maxLength={70}
            />
            <TextField
              label="קישור"
              hint="אפשר להשאיר ריק"
              dir="ltr"
              value={form.announcementHref}
              onChange={(value) => set("announcementHref", value)}
            />
            {form.announcementEnabled && form.announcementTextHe ? (
              <div
                style={{
                  backgroundColor: "var(--admin-ink)",
                  color: "#fffcf7",
                  borderRadius: "var(--admin-r-input)",
                  padding: "0.625rem 0.875rem",
                  textAlign: "center",
                }}
              >
                {form.announcementTextHe}
              </div>
            ) : null}
          </div>
          <CardSave keys={["announcementEnabled", "announcementTextHe", "announcementHref"]} />
        </Card>

        <Card
          title="תמונת שיתוף"
          helpHe="התמונה שמופיעה כשמישהו שולח קישור לאתר בוואטסאפ."
        >
          <ImageDropzone
            labelHe="תמונת שיתוף"
            altHintHe="למשל: כמה הדפסות צבעוניות על רקע קרם"
            onUploaded={async (image) => {
              await update({ patch: { ogImageId: image.storageId } });
              toast.show("התמונה נשמרה");
            }}
          />
        </Card>

        <Card title="התראות אליך" helpHe="לאן להודיע לך על פנייה חדשה. לא מוצג לאף אחד.">
          <div className="a-fields" data-cols="2">
            <TextField
              label="מייל להתראות"
              type="email"
              dir="ltr"
              value={form.notifyEmail}
              onChange={(value) => set("notifyEmail", value)}
            />
            <TextField
              label="וואטסאפ להתראות"
              dir="ltr"
              inputMode="numeric"
              value={form.notifyWhatsapp}
              onChange={(value) => set("notifyWhatsapp", value)}
            />
          </div>
          <div style={{ marginBlockStart: "0.75rem" }}>
            <TextAreaField
              label="פתקים לעצמך"
              value={form.internalNotesHe}
              onChange={(value) => set("internalNotesHe", value)}
              rows={3}
            />
          </div>
          <CardSave keys={["notifyEmail", "notifyWhatsapp", "internalNotesHe"]} />
        </Card>

        <Card title="מצב תחזוקה" helpHe="מחליף את כל האתר בכרטיס אחד. משמש כשאתה לא זמין.">
          <div className="a-stack">
            {settings.maintenanceMode ? (
              <Note tone="danger">האתר סגור עכשיו למבקרים.</Note>
            ) : null}
            <TextAreaField
              label="מה כתוב כשהאתר סגור"
              value={form.maintenanceTextHe}
              onChange={(value) => set("maintenanceTextHe", value)}
              rows={3}
              maxLength={200}
            />
            <div className="a-row" style={{ flexWrap: "wrap" }}>
              {settings.maintenanceMode ? (
                <ActionButton
                  tone="primary"
                  onClick={() => {
                    void update({ patch: { maintenanceMode: false } })
                      .then(() => toast.show("האתר פתוח שוב"))
                      .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
                  }}
                >
                  לפתוח את האתר
                </ActionButton>
              ) : (
                <ActionButton tone="danger" onClick={() => setMaintenanceOpen(true)}>
                  לסגור את האתר
                </ActionButton>
              )}
              <ActionButton
                tone="quiet"
                disabled={!dirtyIn(["maintenanceTextHe"])}
                onClick={() => void saveCard(["maintenanceTextHe"])}
              >
                לשמור טקסט
              </ActionButton>
            </div>
          </div>
        </Card>

        <AccountCard />

        <HelpNote>
          ניהול המשתמשים והפח נמצאים בשרת. המסכים שלהם ייפתחו כאן כשהפונקציות שלהם יהיו מוכנות.
        </HelpNote>
      </div>

      <ConfirmTypeToName
        open={numberOpen}
        titleHe="להחליף את מספר הוואטסאפ?"
        bodyHe="כל פנייה חדשה מהאתר תגיע למספר החדש."
        nameHe={form.whatsappNumberE164}
        confirmHe="להחליף"
        onCancel={() => setNumberOpen(false)}
        onConfirm={() => {
          setNumberOpen(false);
          void saveCard(["whatsappNumberE164"]);
        }}
      />

      <ConfirmTypeToName
        open={maintenanceOpen}
        titleHe="לסגור את האתר למבקרים?"
        bodyHe="כל מי שייכנס יראה כרטיס אחד עם הטקסט שכתבת, ולא יוכל להזמין."
        nameHe="סגור"
        confirmHe="לסגור"
        onCancel={() => setMaintenanceOpen(false)}
        onConfirm={() => {
          setMaintenanceOpen(false);
          void update({ patch: { maintenanceMode: true } })
            .then(() => toast.show("האתר סגור"))
            .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
        }}
      />
    </>
  );
}
