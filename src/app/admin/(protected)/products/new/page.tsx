"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";

import { api } from "@/app/admin/_lib/convex";
import { slugify } from "@/components/admin/format";
import { errorHe, V } from "@/components/admin/messages";
import { useToast } from "@/components/admin/Toast";
import { ActionButton, Card, HelpNote, PageHeader, TextField } from "@/components/admin/ui";

/**
 * מוצר חדש.
 *
 * One field is required and everything else waits, because a new product is
 * created hidden (`active: false` in `products.create`) and cannot be published
 * until it has an image anyway. Asking for eight fields before the row exists is
 * how a person gives up halfway.
 */
export default function NewProductPage() {
  const router = useRouter();
  const toast = useToast();
  const create = useMutation(api.products.create);

  const [titleHe, setTitleHe] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const slug = slugify(titleHe);

  async function submit() {
    if (titleHe.trim().length < 2) {
      setError(V.tooShort(2));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const id = await create({ titleHe: titleHe.trim() });
      toast.show("המוצר נוצר. הוא מוסתר עד שתפרסם אותו");
      router.push(`/admin/products/${id}`);
    } catch (thrown) {
      setError(errorHe(thrown));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="מוצר חדש" backHref="/admin/products" backLabelHe="לכל המוצרים" />

      <Card>
        <div className="a-stack">
          <TextField
            label="שם המוצר"
            hint="מה שהמבקר יראה בקטלוג"
            value={titleHe}
            onChange={setTitleHe}
            maxLength={60}
            error={error}
          />

          {slug ? (
            <HelpNote>
              הכתובת באתר תהיה <bdi dir="ltr">{`/products/${slug}`}</bdi>. אפשר לשנות אותה
              אחר כך במסך העריכה.
            </HelpNote>
          ) : null}

          <ActionButton tone="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? "רגע אחד" : "ליצור מוצר"}
          </ActionButton>
        </div>
      </Card>
    </>
  );
}
