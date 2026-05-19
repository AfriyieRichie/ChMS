import api from "@/lib/api";

export interface Fund {
  id: number;
  name: string;
  code: string;
  description: string;
  is_designated: boolean;
  is_active: boolean;
  branch: number;
}

export interface GivingCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  branch: number;
}

export interface FinancialPeriod {
  id: number;
  branch: number;
  year: number;
  month: number;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: number | null;
  locked_by_name: string | null;
}

export interface Pledge {
  id: number;
  member: number;
  member_name: string;
  branch: number;
  fund: number;
  fund_name: string;
  category: number | null;
  amount: string;
  currency: string;
  start_date: string;
  end_date: string | null;
  frequency: string;
  status: string;
  notes: string;
  total_fulfilled: string;
  balance: string;
}

export interface Contribution {
  id: number;
  receipt_number: string;
  member: number | null;
  member_name: string;
  branch: number;
  fund: number;
  fund_name: string;
  category: number | null;
  category_name: string | null;
  financial_period: number | null;
  pledge: number | null;
  batch: number | null;
  amount: string;
  currency: string;
  given_at: string;
  payment_method: string;
  reference: string;
  notes: string;
  recorded_by_name: string;
  is_reversal: boolean;
  reversal_of: number | null;
}

export interface ContributionSummary {
  grand_total: number;
  by_fund: { fund__id: number; fund__name: string; currency: string; total: number; count: number }[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export async function getFunds(branchId: number, activeOnly = true): Promise<Fund[]> {
  const { data } = await api.get("/api/v1/finance/funds/", {
    headers: h(branchId),
    params: activeOnly ? { active_only: "true" } : {},
  });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createFund(payload: Partial<Fund>, branchId: number): Promise<Fund> {
  const { data } = await api.post("/api/v1/finance/funds/", payload, { headers: h(branchId) });
  return data;
}

export async function getGivingCategories(branchId: number): Promise<GivingCategory[]> {
  const { data } = await api.get("/api/v1/finance/categories/", { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getMonthlyContributions(
  branchId: number,
  months = 6
): Promise<{ month: string; total: string; count: number }[]> {
  const { data } = await api.get("/api/v1/finance/contributions/monthly/", {
    headers: h(branchId),
    params: { months },
  });
  return data;
}

export async function getContributions(
  branchId: number,
  params?: { fund?: number; member?: number; date_from?: string; date_to?: string; page?: number; exclude_reversals?: boolean }
): Promise<PaginatedResponse<Contribution>> {
  const { data } = await api.get("/api/v1/finance/contributions/", {
    headers: h(branchId),
    params: { ...params, exclude_reversals: params?.exclude_reversals ? "true" : undefined },
  });
  return data;
}

export async function createContribution(
  payload: Partial<Contribution>,
  branchId: number
): Promise<Contribution> {
  const { data } = await api.post("/api/v1/finance/contributions/", payload, { headers: h(branchId) });
  return data;
}

export async function reverseContribution(
  id: number,
  reason: string,
  branchId: number
): Promise<Contribution> {
  const { data } = await api.post(
    `/api/v1/finance/contributions/${id}/reverse/`,
    { reason },
    { headers: h(branchId) }
  );
  return data;
}

export async function getContributionSummary(
  branchId: number,
  params?: { date_from?: string; date_to?: string; period?: number }
): Promise<ContributionSummary> {
  const { data } = await api.get("/api/v1/finance/contributions/summary/", {
    headers: h(branchId),
    params,
  });
  return data;
}

export async function updateFund(id: number, payload: Partial<Fund>, branchId: number): Promise<Fund> {
  const { data } = await api.patch(`/api/v1/finance/funds/${id}/`, payload, { headers: h(branchId) });
  return data;
}

export async function createGivingCategory(
  payload: { name: string; description?: string },
  branchId: number,
): Promise<GivingCategory> {
  const { data } = await api.post("/api/v1/finance/categories/", { ...payload, branch: branchId }, { headers: h(branchId) });
  return data;
}

export async function getPledges(
  branchId: number,
  params?: { status?: string; member?: number; fund?: number; page?: number }
): Promise<PaginatedResponse<Pledge>> {
  const { data } = await api.get("/api/v1/finance/pledges/", { headers: h(branchId), params });
  return data;
}

export async function createPledge(payload: Partial<Pledge>, branchId: number): Promise<Pledge> {
  const { data } = await api.post("/api/v1/finance/pledges/", payload, { headers: h(branchId) });
  return data;
}

export async function updatePledge(id: number, payload: Partial<Pledge>, branchId: number): Promise<Pledge> {
  const { data } = await api.patch(`/api/v1/finance/pledges/${id}/`, payload, { headers: h(branchId) });
  return data;
}

export async function getFinancialPeriods(branchId: number): Promise<FinancialPeriod[]> {
  const { data } = await api.get("/api/v1/finance/periods/", { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createFinancialPeriod(payload: { year: number; month: number }, branchId: number): Promise<FinancialPeriod> {
  const { data } = await api.post("/api/v1/finance/periods/", { ...payload, branch: branchId }, { headers: h(branchId) });
  return data;
}

export async function lockPeriod(id: number, branchId: number): Promise<FinancialPeriod> {
  const { data } = await api.post(`/api/v1/finance/periods/${id}/lock/`, {}, { headers: h(branchId) });
  return data;
}

export async function unlockPeriod(id: number, branchId: number): Promise<FinancialPeriod> {
  const { data } = await api.post(`/api/v1/finance/periods/${id}/unlock/`, {}, { headers: h(branchId) });
  return data;
}

// ── Giving Reports ────────────────────────────────────────────────────────────

export interface GivingByMember {
  member: number;
  member__full_name: string;
  currency: string;
  total: string;
  count: number;
}

export interface LapsedGiver {
  member_id: number;
  member_name: string;
  last_given: string | null;
  total_given: string;
}

export async function getGivingByMember(branchId: number, year: number): Promise<GivingByMember[]> {
  const { data } = await api.get("/api/v1/finance/contributions/by_member/", {
    headers: h(branchId),
    params: { year },
  });
  return data;
}

export async function getTopGivers(
  branchId: number,
  params?: { date_from?: string; date_to?: string; limit?: number }
): Promise<GivingByMember[]> {
  const { data } = await api.get("/api/v1/finance/contributions/top_givers/", {
    headers: h(branchId),
    params,
  });
  return data;
}

export async function getLapsedGivers(branchId: number, days = 90): Promise<LapsedGiver[]> {
  const { data } = await api.get("/api/v1/finance/contributions/lapsed/", {
    headers: h(branchId),
    params: { days },
  });
  return data;
}

// ── Contribution Batches ──────────────────────────────────────────────────────

export interface ContributionBatch {
  id: number;
  branch: number;
  name: string;
  service_date: string;
  notes: string;
  is_posted: boolean;
  posted_at: string | null;
  posted_by: number | null;
  posted_by_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  total_amount: string;
  contribution_count: number;
  created_at: string;
  updated_at: string;
}

export async function getContributionBatches(branchId: number): Promise<PaginatedResponse<ContributionBatch>> {
  const { data } = await api.get("/api/v1/finance/batches/", { headers: h(branchId) });
  return data;
}

export async function createContributionBatch(
  payload: { name: string; service_date: string; notes?: string },
  branchId: number
): Promise<ContributionBatch> {
  const { data } = await api.post("/api/v1/finance/batches/", { ...payload, branch: branchId }, { headers: h(branchId) });
  return data;
}

export async function postContributionBatch(id: number, branchId: number): Promise<ContributionBatch> {
  const { data } = await api.post(`/api/v1/finance/batches/${id}/post_batch/`, {}, { headers: h(branchId) });
  return data;
}

export async function deleteContributionBatch(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/finance/batches/${id}/`, { headers: h(branchId) });
}

// ── Bank Deposits ─────────────────────────────────────────────────────────────

export interface BankDeposit {
  id: number;
  branch: number;
  date: string;
  amount: string;
  reference: string;
  notes: string;
  is_reconciled: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBankDeposits(branchId: number): Promise<PaginatedResponse<BankDeposit>> {
  const { data } = await api.get("/api/v1/finance/deposits/", { headers: h(branchId) });
  return data;
}

export async function createBankDeposit(
  payload: { date: string; amount: string; reference: string; notes?: string },
  branchId: number
): Promise<BankDeposit> {
  const { data } = await api.post("/api/v1/finance/deposits/", { ...payload, branch: branchId }, { headers: h(branchId) });
  return data;
}

export async function toggleDepositReconciled(id: number, branchId: number): Promise<BankDeposit> {
  const { data } = await api.post(`/api/v1/finance/deposits/${id}/toggle_reconciled/`, {}, { headers: h(branchId) });
  return data;
}

export async function deleteBankDeposit(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/finance/deposits/${id}/`, { headers: h(branchId) });
}
