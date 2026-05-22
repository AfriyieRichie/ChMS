"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, ArrowRight, ArrowLeft, Clock, Users, MapPin } from "lucide-react";
import {
  getBranches, createBranch, updateBranch, getBranchTransfers,
  type Branch, type ServiceTime, type TransferRecord,
} from "@/lib/api/branches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-white disabled:bg-gray-50";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const branchSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  code: z.string().max(20).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().optional(),
  timezone: z.string().max(50).optional(),
  currency: z.string().max(3).optional(),
  pastor: z.string().max(200).optional(),
  is_active: z.boolean(),
});
type BranchFormValues = z.infer<typeof branchSchema>;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Service times editor ─────────────────────────────────────────────────────

function ServiceTimesEditor({
  value,
  onChange,
}: {
  value: ServiceTime[];
  onChange: (v: ServiceTime[]) => void;
}) {
  const [name, setName] = useState("");
  const [day, setDay] = useState("Sunday");
  const [time, setTime] = useState("");

  function add() {
    if (!name.trim() || !time.trim()) return;
    onChange([...value, { name: name.trim(), day, time: time.trim() }]);
    setName("");
    setTime("");
  }

  return (
    <div className="space-y-2">
      {value.map((st, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <Clock size={13} className="text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800">{st.name}</p>
            <p className="text-xs text-gray-400">{st.day} · {st.time}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-gray-300 hover:text-red-500 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={FIELD}
        />
        <select value={day} onChange={(e) => setDay(e.target.value)} className={FIELD}>
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input
          type="text"
          placeholder="e.g. 9:00 AM"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={FIELD}
        />
      </div>
      <Button type="button" size="sm" variant="outline" onClick={add} disabled={!name.trim() || !time.trim()}>
        <Plus size={13} /> Add Service Time
      </Button>
    </div>
  );
}

// ── Branch detail panel ───────────────────────────────────────────────────────

type PanelTab = "profile" | "transfers";

function BranchPanel({
  branch,
  onClose,
  onUpdated,
}: {
  branch: Branch;
  onClose: () => void;
  onUpdated: (b: Branch) => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PanelTab>("profile");
  const [editing, setEditing] = useState(false);
  const [serviceTimes, setServiceTimes] = useState<ServiceTime[]>(branch.service_times ?? []);

  const { data: transfers } = useQuery({
    queryKey: ["branch-transfers", branch.id],
    queryFn: () => getBranchTransfers(branch.id),
    enabled: tab === "transfers",
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: branchToForm(branch),
  });

  const updateMut = useMutation({
    mutationFn: (d: BranchFormValues) =>
      updateBranch(branch.id, { ...d, service_times: serviceTimes }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      onUpdated(updated);
      setEditing(false);
    },
  });

  function startEdit() {
    reset(branchToForm(branch));
    setServiceTimes(branch.service_times ?? []);
    setEditing(true);
  }

  const logoInitial = branch.name.slice(0, 2).toUpperCase();

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[460px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        {branch.logo ? (
          <img src={branch.logo} alt={branch.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {logoInitial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 truncate">{branch.name}</h2>
            <Badge variant={branch.is_active ? "success" : "default"}>{branch.is_active ? "Active" : "Inactive"}</Badge>
          </div>
          {branch.code && <p className="text-xs text-gray-400 font-mono mt-0.5">{branch.code}</p>}
          {branch.pastor && <p className="text-xs text-gray-500 mt-0.5">Pastor: {branch.pastor}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tab === "profile" && (
            <button onClick={editing ? () => setEditing(false) : startEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 shrink-0">
        {(["profile", "transfers"] as PanelTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold capitalize transition-colors",
              tab === t ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700",
            )}
          >
            {t === "transfers" ? "Transfer Log" : "Profile"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile tab */}
        {tab === "profile" && (
          <div className="px-5 py-4 space-y-5">
            {editing ? (
              <form onSubmit={handleSubmit((d) => updateMut.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-600">Branch Name *</label>
                    <input type="text" {...register("name")} className={FIELD} />
                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Code</label>
                    <input type="text" {...register("code")} placeholder="ACC" className={FIELD} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Currency</label>
                    <input type="text" {...register("currency")} placeholder="GHS" className={FIELD} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-600">Pastor</label>
                    <input type="text" {...register("pastor")} placeholder="Rev. John Smith" className={FIELD} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">City</label>
                    <input type="text" {...register("city")} className={FIELD} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Region</label>
                    <input type="text" {...register("region")} className={FIELD} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Country</label>
                    <input type="text" {...register("country")} className={FIELD} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Timezone</label>
                    <input type="text" {...register("timezone")} className={FIELD} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Phone</label>
                    <input type="tel" {...register("phone")} className={FIELD} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Email</label>
                    <input type="email" {...register("email")} className={FIELD} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-600">Address</label>
                    <textarea {...register("address")} rows={2} className={FIELD} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" {...register("is_active")} id="st_is_active" className="w-4 h-4 rounded" />
                    <label htmlFor="st_is_active" className="text-sm text-gray-700">Active branch</label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Service Times</label>
                  <ServiceTimesEditor value={serviceTimes} onChange={setServiceTimes} />
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" size="sm" disabled={updateMut.isPending}>
                    {updateMut.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                  {updateMut.isError && <p className="text-xs text-red-500">Failed to save.</p>}
                </div>
              </form>
            ) : (
              <>
                {/* Info rows */}
                <div className="space-y-2 text-sm">
                  {branch.pastor && (
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Pastor</span>
                      <span className="text-gray-800">{branch.pastor}</span>
                    </div>
                  )}
                  {branch.address && (
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Address</span>
                      <span className="text-gray-700">{branch.address}</span>
                    </div>
                  )}
                  {(branch.city || branch.region || branch.country) && (
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Location</span>
                      <span className="text-gray-700">{[branch.city, branch.region, branch.country].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-400 w-20 shrink-0">Phone</span>
                      <span className="text-gray-700">{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-400 w-20 shrink-0">Email</span>
                      <span className="text-blue-600">{branch.email}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 w-20 shrink-0">Currency</span>
                    <span className="text-gray-700">{branch.currency}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 w-20 shrink-0">Timezone</span>
                    <span className="text-gray-700">{branch.timezone}</span>
                  </div>
                </div>

                {/* Service times */}
                {(branch.service_times?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Service Times</h3>
                    <div className="space-y-1.5">
                      {branch.service_times.map((st, i) => (
                        <div key={i} className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2">
                          <Clock size={13} className="text-gray-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{st.name}</p>
                            <p className="text-xs text-gray-400">{st.day} · {st.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {(branch.member_count ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users size={14} className="text-gray-400" />
                    {branch.member_count} active member{branch.member_count !== 1 ? "s" : ""}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Transfers tab */}
        {tab === "transfers" && (
          <div className="px-5 py-4">
            {!transfers && <p className="text-sm text-gray-400">Loading…</p>}
            {transfers?.length === 0 && (
              <p className="text-sm text-gray-400">No transfer records found.</p>
            )}
            {transfers && transfers.length > 0 && (
              <div className="space-y-2">
                {transfers.map((t: TransferRecord) => (
                  <div key={t.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      t.direction === "in" ? "bg-gray-100" : "bg-red-100",
                    )}>
                      {t.direction === "in"
                        ? <ArrowRight size={12} className="text-gray-600" />
                        : <ArrowLeft size={12} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{t.member_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.direction === "in" ? "Transferred in" : "Transferred out"} ·{" "}
                        {t.direction === "in" ? t.joined_at : t.left_at}
                      </p>
                      {t.transfer_reason && (
                        <p className="text-xs text-gray-500 mt-1 italic">{t.transfer_reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function branchToForm(b: Branch): BranchFormValues {
  return {
    name: b.name ?? "",
    code: b.code ?? "",
    address: b.address ?? "",
    city: b.city ?? "",
    region: b.region ?? "",
    country: b.country ?? "Ghana",
    phone: b.phone ?? "",
    email: b.email ?? "",
    timezone: b.timezone ?? "Africa/Accra",
    currency: b.currency ?? "GHS",
    pastor: b.pastor ?? "",
    is_active: b.is_active ?? true,
  };
}

const EMPTY: BranchFormValues = {
  name: "", code: "", address: "", city: "", region: "", country: "Ghana",
  phone: "", email: "", timezone: "Africa/Accra", currency: "GHS", pastor: "", is_active: true,
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [newServiceTimes, setNewServiceTimes] = useState<ServiceTime[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["branches", page],
    queryFn: () => getBranches({ page }),
    placeholderData: (prev) => prev,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: EMPTY,
  });

  const createMut = useMutation({
    mutationFn: (d: BranchFormValues) =>
      createBranch({ ...d, slug: slugify(d.name), service_times: newServiceTimes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setShowForm(false);
      setNewServiceTimes([]);
      reset(EMPTY);
    },
  });

  return (
    <div className="p-6 space-y-6">
      {selected && <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setSelected(null)} />}
      {selected && (
        <BranchPanel
          branch={selected}
          onClose={() => setSelected(null)}
          onUpdated={(b) => setSelected(b)}
        />
      )}

      <PageHeader title="Branches" description="Church campuses and network locations.">
        <Button size="sm" onClick={() => { setShowForm((v) => !v); setSelected(null); }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Branch"}
        </Button>
      </PageHeader>

      {showForm && (
        <form
          onSubmit={handleSubmit((d) => createMut.mutate(d))}
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">New Branch</h2>
            <button type="button" onClick={() => { setShowForm(false); reset(EMPTY); }} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Branch Name *</label>
              <input type="text" {...register("name")} placeholder="e.g. Accra Central" className={FIELD} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Code</label>
              <input type="text" {...register("code")} placeholder="ACC" className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Currency</label>
              <input type="text" {...register("currency")} placeholder="GHS" className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Pastor</label>
              <input type="text" {...register("pastor")} placeholder="Rev. John Smith" className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">City</label>
              <input type="text" {...register("city")} className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Region</label>
              <input type="text" {...register("region")} className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Country</label>
              <input type="text" {...register("country")} placeholder="Ghana" className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input type="tel" {...register("phone")} className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input type="email" {...register("email")} className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Address</label>
              <textarea {...register("address")} rows={2} className={FIELD} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Service Times</label>
            <ServiceTimesEditor value={newServiceTimes} onChange={setNewServiceTimes} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create Branch"}
            </Button>
            {createMut.isError && <p className="text-xs text-red-500">Failed to create.</p>}
          </div>
        </form>
      )}

      {/* Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-28" />
                  <div className="h-2.5 bg-gray-100 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isError && <p className="text-sm text-red-500">Failed to load branches.</p>}

      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.results.map((branch: Branch) => (
            <div
              key={branch.id}
              onClick={() => setSelected(branch)}
              className={cn(
                "bg-white border rounded-lg p-4 shadow-sm cursor-pointer transition-all space-y-3 hover:shadow-md",
                selected?.id === branch.id ? "border-blue-400 ring-1 ring-blue-400" : "border-gray-200",
              )}
            >
              <div className="flex items-start gap-3">
                {branch.logo ? (
                  <img src={branch.logo} alt={branch.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {branch.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{branch.name}</h3>
                    <Badge variant={branch.is_active ? "success" : "default"}>
                      {branch.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {branch.code && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{branch.code}</p>}
                </div>
              </div>

              {branch.pastor && (
                <p className="text-xs text-gray-600">
                  <span className="text-gray-400">Pastor </span>{branch.pastor}
                </p>
              )}

              {(branch.city || branch.region) && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={11} className="text-gray-300" />
                  {[branch.city, branch.region, branch.country].filter(Boolean).join(", ")}
                </p>
              )}

              {(branch.service_times?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {branch.service_times.slice(0, 3).map((st, i) => (
                    <span key={i} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">
                      {st.day} {st.time}
                    </span>
                  ))}
                  {branch.service_times.length > 3 && (
                    <span className="text-[10px] text-gray-400">+{branch.service_times.length - 3} more</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 border-t border-gray-50">
                <span className="flex items-center gap-1">
                  <Users size={11} className="text-gray-300" />
                  {branch.member_count ?? 0} members
                </span>
              </div>
            </div>
          ))}
          {data?.results.length === 0 && (
            <p className="col-span-full text-sm text-gray-400 text-center py-10">No branches found.</p>
          )}
        </div>
      )}

      {data && data.count > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{data.count} branch{data.count !== 1 ? "es" : ""}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.next}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
