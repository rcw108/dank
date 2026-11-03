import { z } from "zod";

// One schema for the withdrawal request, used by the form and the server action.
// Field set mirrors Gravity Forms form 10 on dank.capital/account.

export const METHODS = {
  card: { label: "Card deposit", detail: "Mexico only" },
  wire: { label: "Wire transfer", detail: "Domestic or international" },
  check: { label: "Check", detail: "Delivered to your address" },
} as const;

export type Method = keyof typeof METHODS;

// The same message for a missing field and an empty one.
const required = (label: string) =>
  z.string(`Enter the ${label}.`).trim().min(1, `Enter the ${label}.`);

export const methodSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("card"),
    bankName: required("bank name"),
    cardNumber: z
      .string("Enter the full card number.")
      .transform((v) => v.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^\d{15,19}$/, "Enter the full card number.")),
  }),
  z
    .object({
      method: z.literal("wire"),
      bankName: required("bank name"),
      accountHolder: required("account holder name"),
      accountNumber: required("account number"),
      routingNumber: z.string().trim().optional(),
      swift: z.string().trim().optional(),
    })
    .refine((v) => Boolean(v.routingNumber || v.swift), {
      message: "Enter a routing number (US) or a SWIFT code (international).",
      path: ["swift"],
    }),
  z.object({
    method: z.literal("check"),
    payableTo: required("name for the check"),
    deliveryAddress: required("delivery address"),
  }),
]);

export const withdrawalSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount above zero."),
  details: methodSchema,
  confirmed: z.literal(
    true,
    "Confirm that the amount and details are correct.",
  ),
  // Supabase "Email OTP Length" is configurable (6–10 digits).
  code: z.string().regex(/^\d{6,10}$/, "Enter the code from the email."),
});

export type WithdrawalRequest = z.infer<typeof withdrawalSchema>;
