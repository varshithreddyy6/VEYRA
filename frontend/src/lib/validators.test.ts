import { describe, expect, it } from "vitest";
import { registerSchema, screeningSchema } from "@/lib/validators";

const fullFeatures = Object.fromEntries(
  Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, 0.1])
);
const baseScreening = {
  amount: 100,
  occurred_at: "2026-01-15T10:30",
  external_ref: "",
  features: fullFeatures,
};

describe("screeningSchema", () => {
  it("accepts a fully specified transaction", () => {
    const parsed = screeningSchema.safeParse(baseScreening);
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing V-feature", () => {
    const { features, ...rest } = baseScreening;
    const missing = { ...rest, features: { ...features } };
    delete (missing.features as Record<string, number>)["V14"];
    expect(screeningSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects non-finite feature values and negative amounts", () => {
    expect(
      screeningSchema.safeParse({ ...baseScreening, features: { ...fullFeatures, V5: Number.POSITIVE_INFINITY } }).success
    ).toBe(false);
    expect(screeningSchema.safeParse({ ...baseScreening, amount: -5 }).success).toBe(false);
  });

  it("rejects invalid timestamps", () => {
    expect(screeningSchema.safeParse({ ...baseScreening, occurred_at: "not-a-date" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    full_name: "Jane Analyst",
    email: "jane@example.com",
    password: "Password123!",
    confirm_password: "Password123!",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects short and non-alphanumeric passwords", () => {
    expect(registerSchema.safeParse({ ...base, password: "abc", confirm_password: "abc" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "password", confirm_password: "password" }).success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    expect(registerSchema.safeParse({ ...base, confirm_password: "Different123!" }).success).toBe(false);
  });

  it("rejects invalid emails", () => {
    expect(registerSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });
});
