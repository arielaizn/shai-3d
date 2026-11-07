"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api, type Doc, type Id } from "@/app/admin/_lib/convex";
import { ConfirmTypeToName, DangerDialog } from "@/components/admin/Dialogs";
import { ACCENT_HE, PRICE_MODE_HE, slugify } from "@/components/admin/format";
import { GlbUploader } from "@/components/admin/GlbUploader";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import { errorHe, V } from "@/components/admin/messages";
import { SaveBar, useUnsavedChanges } from "@/components/admin/SaveBar";
import { SortableList, type SortableEntry } from "@/components/admin/SortableList";
import { useToast } from "@/components/admin/Toast";
import {
  ActionButton,
  Card,
  HelpNote,
  LoadingBlock,
  MoneyField,
  Note,
  NumberStepper,
  PageHeader,
  Segmented,
  SelectField,
  TextAreaField,
  TextField,
  Toggle,
} from "@/components/admin/ui";

/**
 * עריכת מוצר, 06 §C.8.
 *
 * Explicit save (06 §C.19: public text waits for a press), with one exception
 * that the spec makes on purpose: images and the model are files. They upload the
 * moment they are chosen and their own mutations write immediately, because a
 * file that is "saved later" is a file that is lost when the phone rings.
 */

type Accent = Doc<"products">["accent"];
type PriceMode = Doc<"products">["priceMode"];

type Form = {
  titleHe: string;
  subtitleHe: string;
  slug: string;
  descriptionHe: string;
  priceMode: PriceMode;
  priceAgorot: number;
  printTypeId: string;
  sizeNoteHe: string;
  leadTimeDaysMin: number;
  leadTimeDaysMax: number;
  badgeHe: string;
  badgeAccent: Accent;
  accent: Accent;
  featured: boolean;
  seoTitleHe: string;
  seoDescriptionHe: string;
};

function toForm(product: Doc<"products">): Form {
  return {
    titleHe: product.titleHe,
    subtitleHe: product.subtitleHe ?? "",
    slug: product.slug,
    descriptionHe: product.descriptionHe,
    priceMode: product.priceMode,
    priceAgorot: product.priceAgorot,
    printTypeId: product.printTypeId ?? "",
    sizeNoteHe: product.sizeNoteHe ?? "",
    leadTimeDaysMin: product.leadTimeDaysMin,
    leadTimeDaysMax: product.leadTimeDaysMax,
    badgeHe: product.badgeHe ?? "",
    badgeAccent: product.badgeAccent,
    accent: product.accent,
    featured: product.featured,
    seoTitleHe: product.seoTitleHe ?? "",
    seoDescriptionHe: product.seoDescriptionHe ?? "",
  };
}

const ACCENT_OPTIONS = (["none", "red", "turquoise", "yellow", "ink"] as Accent[]).map(
  (value) => ({ value, labelHe: ACCENT_HE[value] }),
);

export default function ProductEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"products">;
  const router = useRouter();
  const toast = useToast();

  const data = useQuery(api.products.get, { id });
  const printTypes = useQuery(api.printTypes.listAdmin, {});

  const update = useMutation(api.products.update);
  const setActive = useMutation(api.products.setActive);
  const softDelete = useMutation(api.products.softDelete);
  const addImage = useMutation(api.products.addImage);
  const removeImage = useMutation(api.products.removeImage);
  const reorderImages = useMutation(api.products.reorderImages);
  const setHeroImage = useMutation(api.products.setHeroImage);
  const attachModel = useMutation(api.products.attachModel);
  const removeModel = useMutation(api.products.removeModel);

  const [form, setForm] = React.useState<Form | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [imageToRemove, setImageToRemove] = React.useState<Id<"productImages"> | null>(null);
  const [slugOpen, setSlugOpen] = React.useState(false);

  const product = data?.product;
  const baseline = React.useMemo(() => (product ? toForm(product) : null), [product]);

  React.useEffect(() => {
    if (baseline && form === null) setForm(baseline);
  }, [baseline, form]);

  const dirty =
    form !== null && baseline !== null && JSON.stringify(form) !== JSON.stringify(baseline);
  const { guard } = useUnsavedChanges(dirty);

  if (data === undefined) return <LoadingBlock rows={4} />;
  if (data === null || !product || !form) {
    return (
      <>
        <PageHeader title="לא מצאתי את המוצר" backHref="/admin/products" backLabelHe="לרשימה" />
        <Card>
          <p className="a-muted">אולי הוא בפח. אפשר לחזור לרשימה ולבדוק.</p>
        </Card>
      </>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const titleError =
    form.titleHe.trim().length < 2
      ? V.tooShort(2)
      : form.titleHe.length > 60
        ? V.tooLong(60)
        : undefined;

  async function save() {
    if (!form || titleError) return;
    setSaving(true);
    try {
      await update({
        id,
        patch: {
          titleHe: form.titleHe.trim(),
          subtitleHe: form.subtitleHe.trim(),
          slug: form.slug.trim() || slugify(form.titleHe),
          descriptionHe: form.descriptionHe,
          priceMode: form.priceMode,
          priceAgorot: form.priceMode === "quote" ? 0 : form.priceAgorot,
          sizeNoteHe: form.sizeNoteHe.trim(),
          leadTimeDaysMin: form.leadTimeDaysMin,
          leadTimeDaysMax: form.leadTimeDaysMax,
          badgeHe: form.badgeHe.trim(),
          badgeAccent: form.badgeAccent,
          accent: form.accent,
          featured: form.featured,
          seoTitleHe: form.seoTitleHe.trim(),
          seoDescriptionHe: form.seoDescriptionHe.trim(),
          ...(form.printTypeId
            ? { printTypeId: form.printTypeId as Id<"printTypes"> }
            : {}),
        },
      });
      /* the same trims the mutation received, so a saved form is a clean form */
      setForm((current) =>
        current
          ? {
              ...current,
              titleHe: current.titleHe.trim(),
              subtitleHe: current.subtitleHe.trim(),
              slug: slugify(current.slug.trim() || current.titleHe),
              descriptionHe: current.descriptionHe,
              sizeNoteHe: current.sizeNoteHe.trim(),
              badgeHe: current.badgeHe.trim(),
              seoTitleHe: current.seoTitleHe.trim(),
              seoDescriptionHe: current.seoDescriptionHe.trim(),
              priceAgorot: current.priceMode === "quote" ? 0 : current.priceAgorot,
            }
          : current,
      );
      toast.show(V.saved);
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  const imageEntries: SortableEntry[] = data.images.map((image) => ({
    id: image._id,
    labelHe: image.altHe,
    content: (
      <div style={{ display: "grid", gap: "0.25rem", justifyItems: "center", minInlineSize: 0 }}>
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt=""
            style={{
              inlineSize: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: "0.75rem",
              border: image.isHero ? "3px solid var(--admin-turquoise)" : "1px solid var(--admin-line)",
            }}
          />
        ) : (
          <span className="a-thumb" aria-hidden="true" />
        )}
        <div className="a-row" style={{ gap: "0.25rem" }}>
          <button
            type="button"
            className="a-iconbtn"
            aria-label={`תמונה ראשית: ${image.altHe}`}
            aria-pressed={image.isHero}
            onClick={() => {
              void setHeroImage({ productId: id, imageId: image._id }).catch((thrown: unknown) =>
                toast.show(errorHe(thrown), { tone: "error" }),
              );
            }}
          >
            {image.isHero ? "★︎" : "☆︎"}
          </button>
          <button
            type="button"
            className="a-iconbtn"
            aria-label={`מחיקת התמונה: ${image.altHe}`}
            onClick={() => setImageToRemove(image._id)}
          >
            ✕︎
          </button>
        </div>
      </div>
    ),
  }));

  return (
    <>
      <PageHeader
        title={product.titleHe}
        helpHe={product.active ? "מוצג באתר" : "מוסתר. אף אחד חוץ ממך לא רואה אותו."}
        backHref="/admin/products"
        backLabelHe="לכל המוצרים"
        actions={
          <ActionButton
            tone={product.active ? "quiet" : "primary"}
            onClick={() => {
              void setActive({ id, active: !product.active })
                .then(() => toast.show(product.active ? "המוצר הוסתר" : "המוצר פורסם"))
                .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
            }}
          >
            {product.active ? "להסתיר" : "לפרסם"}
          </ActionButton>
        }
      />

      <div className="a-stack" style={{ paddingBlockEnd: dirty ? "5rem" : undefined }}>
        <Card title="בסיס">
          <div className="a-fields" data-cols="2">
            <TextField
              label="שם המוצר"
              value={form.titleHe}
              onChange={(value) => set("titleHe", value)}
              maxLength={60}
              error={titleError}
            />
            <TextField
              label="שורה מתחת לשם"
              hint="אפשר להשאיר ריק"
              value={form.subtitleHe}
              onChange={(value) => set("subtitleHe", value)}
              maxLength={80}
            />
          </div>

          <details
            open={slugOpen}
            onToggle={(event) => setSlugOpen((event.target as HTMLDetailsElement).open)}
            style={{ marginBlockStart: "0.75rem" }}
          >
            <summary style={{ minBlockSize: "3rem", display: "flex", alignItems: "center" }}>
              כתובת באתר
            </summary>
            <div style={{ marginBlockStart: "0.5rem" }}>
              <TextField
                label="כתובת"
                hint="רק אותיות באנגלית, מספרים ומקפים"
                dir="ltr"
                value={form.slug}
                onChange={(value) => set("slug", value)}
              />
              {product.active && form.slug !== product.slug ? (
                <Note>שינוי הכתובת ישבור קישורים ישנים למוצר הזה.</Note>
              ) : null}
            </div>
          </details>
        </Card>

        <Card title="תיאור" helpHe="שורה ריקה פותחת פסקה חדשה.">
          <TextAreaField
            label="מה זה"
            value={form.descriptionHe}
            onChange={(value) => set("descriptionHe", value)}
            rows={7}
            maxLength={1200}
          />
        </Card>

        <Card
          title="תמונות"
          helpHe="הכוכב קובע איזו תמונה ראשית. גרירה משנה סדר. צריך לפחות תמונה אחת לפני פרסום."
        >
          <div className="a-stack">
            {data.images.length > 0 ? (
              <SortableList
                layout="grid"
                entries={imageEntries}
                onMove={(imageId, beforeId, afterId) => {
                  void reorderImages({
                    imageId: imageId as Id<"productImages">,
                    beforeId: beforeId as Id<"productImages"> | undefined,
                    afterId: afterId as Id<"productImages"> | undefined,
                  }).catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
                }}
              />
            ) : (
              <Note>{V.needOneImage}</Note>
            )}

            <ImageDropzone
              labelHe="תמונה חדשה"
              altHintHe="למשל: מחזיק מפתחות בצורת לב על שולחן עץ"
              onUploaded={async (image) => {
                await addImage({
                  productId: id,
                  storageId: image.storageId,
                  altHe: image.altHe,
                  width: image.width,
                  height: image.height,
                  blurDataUrl: image.blurDataUrl,
                });
                toast.show("התמונה נוספה");
              }}
            />
          </div>
        </Card>

        <Card title="מודל תלת מימד" helpHe="קובץ GLB אחד. זה מה שמסתובב בעמוד המוצר.">
          <div className="a-stack">
            {data.models.map((model) => (
              <div key={model._id} className="a-item">
                <div className="a-grow" style={{ minInlineSize: 0 }}>
                  <bdi dir="ltr">{model.filename}</bdi>
                  <p className="a-muted a-num">
                    <bdi dir="ltr">{(model.triangleCount ?? 0).toLocaleString("en")}</bdi> משולשים ·{" "}
                    <bdi dir="ltr">
                      {`${model.boundingBoxMm.x}x${model.boundingBoxMm.y}x${model.boundingBoxMm.z}`}
                    </bdi>{" "}
                    מ״מ · <bdi dir="ltr">{Math.round(model.sizeBytes / 1024 / 1024)}</bdi> מגה
                  </p>
                </div>
                <button
                  type="button"
                  className="a-iconbtn"
                  aria-label={`מחיקת הדגם ${model.filename}`}
                  onClick={() => {
                    void removeModel({ modelId: model._id })
                      .then(() => toast.show("הדגם נמחק"))
                      .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
                  }}
                >
                  ✕︎
                </button>
              </div>
            ))}

            <GlbUploader
              onUploaded={async (model) => {
                await attachModel({
                  productId: id,
                  storageId: model.storageId as Id<"_storage">,
                  filename: model.filename,
                  sizeBytes: model.sizeBytes,
                  triangleCount: model.triangleCount,
                  boundingBoxMm: model.boundingBoxMm,
                });
                toast.show("הדגם עלה");
              }}
            />

            <HelpNote>
              זווית ההתחלה נשמרת עם ברירת מחדל. אחרי שהתצוגה התלת ממדית של האתר תעלה, אפשר יהיה
              לקבוע אותה כאן מתוך התצוגה עצמה.
            </HelpNote>
          </div>
        </Card>

        <Card title="מחיר">
          <div className="a-stack">
            <Segmented
              label="איך מוצג המחיר"
              value={form.priceMode}
              options={(["fixed", "from", "quote"] as PriceMode[]).map((value) => ({
                value,
                labelHe: PRICE_MODE_HE[value],
              }))}
              onChange={(value) => set("priceMode", value)}
            />
            {form.priceMode === "quote" ? (
              <p className="a-muted">בלי מספר. המבקר יראה שהמחיר נקבע בשיחה.</p>
            ) : (
              <MoneyField
                label="מחיר"
                agorot={form.priceAgorot}
                onChange={(value) => set("priceAgorot", value)}
                minAgorot={0}
              />
            )}
          </div>
        </Card>

        <Card title="קישור למחולל" helpHe="כפתור המוצר יפתח את המחולל עם הסוג הזה כבר נבחר.">
          <SelectField
            label="סוג הדפסה"
            value={form.printTypeId}
            options={[
              { value: "", labelHe: "בלי קישור" },
              ...(printTypes ?? []).map((type) => ({
                value: type._id as string,
                labelHe: type.nameHe,
              })),
            ]}
            onChange={(value) => set("printTypeId", value)}
          />
        </Card>

        <Card title="תצוגה">
          <div className="a-fields" data-cols="2">
            <TextField
              label="תג קטן"
              hint="למשל: חדש. אפשר להשאיר ריק"
              value={form.badgeHe}
              onChange={(value) => set("badgeHe", value)}
              maxLength={14}
            />
            <SelectField
              label="צבע התג"
              value={form.badgeAccent}
              options={ACCENT_OPTIONS}
              onChange={(value) => set("badgeAccent", value)}
            />
            <SelectField
              label="צבע המוצר"
              value={form.accent}
              options={ACCENT_OPTIONS}
              onChange={(value) => set("accent", value)}
            />
            <TextField
              label="הערת גודל"
              hint="למשל: 12 על 8 סנטימטר"
              value={form.sizeNoteHe}
              onChange={(value) => set("sizeNoteHe", value)}
            />
          </div>

          <div className="a-row" style={{ flexWrap: "wrap", marginBlockStart: "0.5rem" }}>
            <Toggle
              label="להציג בדף הבית"
              checked={form.featured}
              onChange={(value) => set("featured", value)}
            />
            <NumberStepper
              label="ימי עבודה, מינימום"
              value={form.leadTimeDaysMin}
              min={1}
              max={30}
              onChange={(value) => set("leadTimeDaysMin", value)}
            />
            <NumberStepper
              label="ימי עבודה, מקסימום"
              value={form.leadTimeDaysMax}
              min={1}
              max={60}
              onChange={(value) => set("leadTimeDaysMax", value)}
            />
          </div>
        </Card>

        <Card title="איך זה נראה בגוגל ובוואטסאפ">
          <details>
            <summary style={{ minBlockSize: "3rem", display: "flex", alignItems: "center" }}>
              פתיחה
            </summary>
            <div className="a-stack" style={{ marginBlockStart: "0.5rem" }}>
              <TextField
                label="כותרת"
                value={form.seoTitleHe}
                onChange={(value) => set("seoTitleHe", value)}
                maxLength={60}
              />
              <TextAreaField
                label="תיאור"
                value={form.seoDescriptionHe}
                onChange={(value) => set("seoDescriptionHe", value)}
                maxLength={160}
                rows={3}
              />
              <div className="a-note" data-tone="ok" style={{ background: "var(--admin-sunken)", borderColor: "var(--admin-line)", color: "var(--admin-ink)" }}>
                <strong>{form.seoTitleHe || form.titleHe}</strong>
                <p className="a-muted">{form.seoDescriptionHe || form.subtitleHe}</p>
              </div>
            </div>
          </details>
        </Card>

        <Card title="מחיקה">
          <ActionButton tone="danger" onClick={() => setDeleting(true)}>
            למחוק מוצר
          </ActionButton>
        </Card>
      </div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
        onReset={() => setForm(baseline)}
        blockedReasonHe={titleError}
      />
      {guard}

      <DangerDialog
        open={deleting}
        titleHe={`למחוק את «${product.titleHe}»?`}
        bodyHe="אפשר לשחזר מהפח במשך 30 יום."
        confirmHe="למחוק"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          void softDelete({ id })
            .then(() => {
              toast.show("המוצר עבר לפח");
              router.push("/admin/products");
            })
            .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
        }}
      />

      <ConfirmTypeToName
        open={imageToRemove !== null}
        titleHe="למחוק את התמונה?"
        bodyHe="התמונה נמחקת מהאחסון ואי אפשר לשחזר אותה."
        nameHe="מחיקה"
        confirmHe="למחוק"
        onCancel={() => setImageToRemove(null)}
        onConfirm={() => {
          const imageId = imageToRemove;
          setImageToRemove(null);
          if (!imageId) return;
          void removeImage({ imageId })
            .then(() => toast.show("התמונה נמחקה"))
            .catch((thrown: unknown) => toast.show(errorHe(thrown), { tone: "error" }));
        }}
      />
    </>
  );
}
