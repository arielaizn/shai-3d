"use client";

/**
 * החשבון שלי. The card the settings screen kept promising.
 *
 * `convex/admins.ts` has had `changePassword` and `updateProfile` for a while, and the
 * settings screen ended with a note saying their screens would open when the functions
 * were ready. They were ready. Until this card existed the only way to change the
 * password was the command line, which means in practice the password never changed.
 *
 * **Changing the password signs you out.** `changePassword` ends every session on the
 * account, which is the correct behaviour and the whole reason most people change a
 * password. The card says so before the tap rather than after it, and sends you back
 * to the door.
 *
 * **The new password is typed twice.** There is no recovery mail on this deployment
 * and nobody else can reset it, so a typo here is a locked panel and a trip to the
 * command line.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";

import { api } from "@/app/admin/_lib/convex";
import { errorHe } from "@/components/admin/messages";
import { useToast } from "@/components/admin/Toast";
import { ActionButton, Card, HelpNote, Note, TextField } from "@/components/admin/ui";

/** Matches `MIN_LENGTH` in `convex/admins.ts`. The server refuses anything shorter. */
const MIN_LENGTH = 8;

export function AccountCard() {
  const me = useQuery(api.admins.me, {});
  const changePassword = useAction(api.admins.changePassword);
  const updateProfile = useMutation(api.admins.updateProfile);
  const toast = useToast();
  const router = useRouter();

  const [displayNameHe, setDisplayNameHe] = React.useState("");
  const [nameTouched, setNameTouched] = React.useState(false);
  const [next, setNext] = React.useState("");
  const [again, setAgain] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* The server row is the truth until the field is touched, so a name saved from
     another tab still shows up here. */
  const name = nameTouched ? displayNameHe : (me?.displayNameHe ?? "");

  if (me === undefined) return null;
  if (me === null) return null;

  const nameDirty = nameTouched && name.trim() !== me.displayNameHe && name.trim().length >= 2;
  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = again.length > 0 && next !== again;
  const canSave = next.length >= MIN_LENGTH && next === again && !busy;

  async function saveName() {
    setBusy(true);
    try {
      await updateProfile({ displayNameHe: name.trim() });
      setNameTouched(false);
      toast.show("השם עודכן");
    } catch (thrown) {
      toast.show(errorHe(thrown), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword({ newPassword: next });
      toast.show("הסיסמה הוחלפה. צריך להיכנס מחדש");
      router.replace("/admin/login");
    } catch (thrown) {
      setError(errorHe(thrown));
      setBusy(false);
    }
  }

  return (
    <Card title="החשבון שלי" helpHe="הכניסה לממשק, והשם שמופיע למעלה.">
      <div className="a-stack">
        <p className="a-num">
          מחובר כ־<bdi dir="ltr">{me.email}</bdi>
        </p>

        <TextField
          label="השם שמופיע בממשק"
          value={name}
          onChange={(value) => {
            setNameTouched(true);
            setDisplayNameHe(value);
          }}
          maxLength={24}
        />
        {nameDirty ? (
          <div>
            <ActionButton onClick={() => void saveName()} disabled={busy}>
              לשמור את השם
            </ActionButton>
          </div>
        ) : null}

        <hr className="a-rule" />

        <TextField
          label="סיסמה חדשה"
          type="password"
          dir="ltr"
          value={next}
          onChange={setNext}
          hint={`לפחות ${MIN_LENGTH} תווים`}
          error={tooShort ? `הסיסמה צריכה להיות באורך ${MIN_LENGTH} תווים לפחות` : undefined}
        />
        <TextField
          label="הסיסמה החדשה שוב"
          type="password"
          dir="ltr"
          value={again}
          onChange={setAgain}
          error={mismatch ? "שתי הסיסמאות לא זהות" : undefined}
        />

        {error ? <Note tone="danger">{error}</Note> : null}

        <Note>החלפת הסיסמה מנתקת את כל המכשירים המחוברים, וגם אותך. תצטרך להיכנס שוב עם החדשה.</Note>

        <div>
          <ActionButton tone="primary" onClick={() => void save()} disabled={!canSave}>
            להחליף סיסמה
          </ActionButton>
        </div>

        <HelpNote>
          אין שחזור סיסמה במייל בממשק הזה. כדאי לשמור את הסיסמה במקום שאתה זוכר.
        </HelpNote>
      </div>
    </Card>
  );
}
