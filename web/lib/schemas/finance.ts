import { z } from "zod";

// Use z.number() (not z.coerce) — coerce infers as `unknown` in Zod v4.
// Form inputs use { valueAsNumber: true } or { setValueAs } in register() to handle string→number.

export const contributionSchema = z.object({
  fund: z.number().min(1, "Fund is required"),
  category: z.number().nullable().optional(),
  member: z.number().nullable().optional(),
  pledge: z.number().nullable().optional(),
  financial_period: z.number().nullable().optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    "Amount must be greater than zero"
  ),
  currency: z.string(),
  given_at: z.string().min(1, "Date is required"),
  payment_method: z.enum(["cash", "cheque", "bank_transfer", "mobile_money", "card"]),
  reference: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export type ContributionFormValues = z.infer<typeof contributionSchema>;

export const fundSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().max(20).optional(),
  description: z.string().optional(),
  is_designated: z.boolean(),
});

export type FundFormValues = z.infer<typeof fundSchema>;

export const pledgeSchema = z.object({
  member: z.number().min(1, "Member is required"),
  fund: z.number().min(1, "Fund is required"),
  category: z.number().nullable().optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    "Must be positive"
  ),
  currency: z.string(),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().nullable().optional(),
  frequency: z.enum(["one_time", "weekly", "biweekly", "monthly", "quarterly", "annual"]),
  notes: z.string().optional(),
});

export type PledgeFormValues = z.infer<typeof pledgeSchema>;
