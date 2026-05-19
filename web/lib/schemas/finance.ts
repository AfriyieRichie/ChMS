import { z } from "zod";

export const contributionSchema = z.object({
  fund: z.coerce.number().min(1, "Fund is required"),
  category: z.coerce.number().optional().nullable(),
  member: z.coerce.number().optional().nullable(),
  pledge: z.coerce.number().optional().nullable(),
  financial_period: z.coerce.number().optional().nullable(),
  amount: z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    "Amount must be greater than zero"
  ),
  currency: z.string().default("GHS"),
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
  is_designated: z.boolean().default(false),
});

export type FundFormValues = z.infer<typeof fundSchema>;

export const pledgeSchema = z.object({
  member: z.coerce.number().min(1, "Member is required"),
  fund: z.coerce.number().min(1, "Fund is required"),
  category: z.coerce.number().optional().nullable(),
  amount: z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    "Must be positive"
  ),
  currency: z.string().default("GHS"),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().optional().nullable(),
  frequency: z.enum(["one_time", "weekly", "biweekly", "monthly", "quarterly", "annual"]),
  notes: z.string().optional(),
});

export type PledgeFormValues = z.infer<typeof pledgeSchema>;
