import { describe, expect, it } from "vitest";

import { CONTACT } from "@/content/contact";
import {
  emptyContactValues,
  firstInvalidField,
  hasErrors,
  isIsraeliPhone,
  normaliseIsraeliPhone,
  validateContact,
  validateEmail,
  validateMessage,
  validateName,
  validatePhone,
} from "./validation";

const ERRORS = CONTACT.form.errors;

/**
 * These tests exist for one reason: the phone rules here are a copy of the rules
 * inside `convex/contact.ts`, which cannot be imported into a browser bundle. If the
 * two ever drift, a visitor fills the form in correctly and is told it did not send,
 * with no field to look at. The cases below are the exact shapes a person types.
 */
describe("normaliseIsraeliPhone", () => {
  it("accepts the three ways an Israeli number is written", () => {
    expect(normaliseIsraeliPhone("0501234567")).toBe("972501234567");
    expect(normaliseIsraeliPhone("050-123-4567")).toBe("972501234567");
    expect(normaliseIsraeliPhone("+972 50 123 4567")).toBe("972501234567");
  });

  it("leaves a number it cannot place alone rather than mangling it", () => {
    expect(normaliseIsraeliPhone("+1 555 0100")).toBe("15550100");
  });
});

describe("isIsraeliPhone", () => {
  it("takes a mobile and a landline", () => {
    expect(isIsraeliPhone("972501234567")).toBe(true);
    expect(isIsraeliPhone("97221234567")).toBe(true);
  });

  it("rejects a number that is too long, too short, or not Israeli", () => {
    expect(isIsraeliPhone("9725012345678")).toBe(false);
    expect(isIsraeliPhone("9725012345")).toBe(false);
    expect(isIsraeliPhone("15550100")).toBe(false);
  });

  /**
   * The rule is copied from the mutation, leniency included: `972` plus eight
   * digits is how an Israeli landline is written, so a mobile missing one digit
   * has the same shape and passes. Tightening it here would reject real landlines
   * on the client for numbers the server accepts, which is the worse failure.
   */
  it("matches the mutation exactly, including where the mutation is lenient", () => {
    expect(isIsraeliPhone("97250123456")).toBe(true);
  });
});

describe("field validators", () => {
  it("names the empty field without blaming anyone", () => {
    expect(validateName("   ")).toBe(ERRORS.name.required);
    expect(validatePhone("")).toBe(ERRORS.phone.required);
    expect(validateMessage("")).toBe(ERRORS.message.required);
  });

  it("separates too short from missing", () => {
    expect(validateName("א")).toBe(ERRORS.name.short);
    expect(validateMessage("שלום")).toBe(ERRORS.message.short);
  });

  it("reports too long", () => {
    expect(validateName("א".repeat(61))).toBe(ERRORS.name.long);
    expect(validateMessage("א".repeat(1201))).toBe(ERRORS.message.long);
  });

  it("passes a real answer", () => {
    expect(validateName("שי")).toBeUndefined();
    expect(validatePhone("050-123-4567")).toBeUndefined();
    expect(validateMessage("רוצה ליתופן מתמונה של הכלב")).toBeUndefined();
  });

  it("treats an empty email as valid, because the label says it is optional", () => {
    expect(validateEmail("")).toBeUndefined();
    expect(validateEmail("  ")).toBeUndefined();
    expect(validateEmail("shai@example.com")).toBeUndefined();
    expect(validateEmail("shai@example")).toBe(ERRORS.email.invalid);
  });
});

describe("validateContact", () => {
  it("returns nothing for a form that may be sent", () => {
    const errors = validateContact({
      name: "רון",
      phone: "0501234567",
      email: "",
      message: "רוצה מחזיק מפתחות עם השם של הבת שלי",
    });
    expect(hasErrors(errors)).toBe(false);
    expect(firstInvalidField(errors)).toBeNull();
  });

  it("points at the first field in tab order that is wrong", () => {
    const errors = validateContact(emptyContactValues());
    expect(hasErrors(errors)).toBe(true);
    expect(firstInvalidField(errors)).toBe("name");
    expect(errors.email).toBeUndefined();
  });
});
