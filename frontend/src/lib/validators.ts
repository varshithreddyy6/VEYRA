/** Zod schemas for forms (mirror backend validation rules). */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Full name must be at least 2 characters").max(120),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[a-zA-Z]/, "Must contain at least one letter")
      .regex(/[0-9]/, "Must contain at least one digit"),
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Transaction screening form: V1..V28 all required, Amount and time required. */
const featureEntries = Object.fromEntries(
  Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, z.coerce.number({ invalid_type_error: "Required" }).finite()])
);

export const screeningSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Amount is required" }).min(0, "Amount is required").max(1_000_000),
  occurred_at: z
    .string()
    .min(1, "Timestamp is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid timestamp"),
  external_ref: z.string().max(128).optional().or(z.literal("")),
  features: z.object(featureEntries),
});

export type ScreeningFormValues = z.infer<typeof screeningSchema>;
