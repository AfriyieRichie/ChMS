"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getMember, updateMember, getMemberGroups, getMemberDiscipleship, getMemberAttendance, type MemberDetail, type MemberAttendanceEntry } from "@/lib/api/members";
import { getContributions } from "@/lib/api/finance";
import { getHouseholds, type Household } from "@/lib/api/households";

const BRANCH_ID = 1;

const STAGES = [
  { key: "new_believer", label: "New Believer" },
  { key: "foundation", label: "Foundation Class" },
  { key: "water_baptism", label: "Water Baptism" },
  { key: "holy_spirit", label: "Holy Spirit Baptism" },
  { key: "discipleship", label: "Discipleship Class" },
  { key: "membership", label: "Membership Class" },
];

const STATUS_COLORS: Record<string, string> = {
  visitor: "bg-yellow-100 text-yellow-800",
  regular: "bg-blue-100 text-blue-800",
  member: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
};

const DISC_COLORS: Record<string, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-400",
  dropped: "bg-red-300",
};

const editSchema = z.object({
  first_name: z.string().min(1, "Required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Required"),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  membership_status: z.string(),
  date_joined: z.string().optional(),
  baptism_status: z.string().optional(),
  baptism_date: z.string().optional(),
  notes: z.string().optional(),
  household: z.number().nullable().optional(),
});

type EditValues = z.infer<typeof editSchema>;

type Tab = "profile" | "giving" | "groups" | "discipleship" | "attendance";

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);
  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);

  const { data: member, isLoading, isError } = useQuery({
    queryKey: ["member", id, BRANCH_ID],
    queryFn: () => getMember(id, BRANCH_ID),
  });

  const { data: contributions } = useQuery({
    queryKey: ["contributions", BRANCH_ID, "member", id],
    queryFn: () => getContributions(BRANCH_ID, { member: id, exclude_reversals: false }),
    enabled: tab === "giving",
  });

  const { data: groups } = useQuery({
    queryKey: ["member-groups", id, BRANCH_ID],
    queryFn: () => getMemberGroups(id, BRANCH_ID),
    enabled: tab === "groups",
  });

  const { data: discipleship } = useQuery({
    queryKey: ["member-discipleship", id, BRANCH_ID],
    queryFn: () => getMemberDiscipleship(id, BRANCH_ID),
    enabled: tab === "discipleship",
  });

  const { data: households } = useQuery({
    queryKey: ["households", BRANCH_ID],
    queryFn: () => getHouseholds(BRANCH_ID),
    enabled: editing,
  });

  const { data: attendanceHistory } = useQuery({
    queryKey: ["member-attendance", id, BRANCH_ID],
    queryFn: () => getMemberAttendance(id, BRANCH_ID),
    enabled: tab === "attendance",
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: member ? {
      first_name: member.first_name,
      middle_name: member.middle_name || "",
      last_name: member.last_name,
      gender: member.gender || "",
      date_of_birth: member.date_of_birth || "",
      marital_status: member.marital_status || "",
      occupation: member.occupation || "",
      phone: member.phone || "",
      email: member.email || "",
      address: member.address || "",
      membership_status: member.membership_status,
      date_joined: member.date_joined || "",
      baptism_status: member.baptism_status || "",
      baptism_date: member.baptism_date || "",
      notes: member.notes || "",
      household: member.household ?? null,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (d: EditValues) => updateMember(id, d, BRANCH_ID),
    onSuccess: (updated) => {
      queryClient.setQueryData(["member", id, BRANCH_ID], updated);
      queryClient.invalidateQueries({ queryKey: ["members", BRANCH_ID] });
      setEditing(false);
    },
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (isError || !member) return (
    <div className="p-8 text-center text-red-500">
      Member not found. <Link href="/dashboard/members" className="text-blue-600 underline">Back to list</Link>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/members" className="text-xs text-gray-400 hover:text-gray-600">← Members</Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">{member.full_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[member.membership_status] ?? "bg-gray-100 text-gray-600"}`}>
              {member.membership_status.charAt(0).toUpperCase() + member.membership_status.slice(1)}
            </span>
            {member.gender && <span className="text-xs text-gray-400 capitalize">{member.gender}</span>}
          </div>
        </div>
        {tab === "profile" && (
          <button onClick={() => { setEditing((v) => !v); reset(); }}
            className="px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">
            {editing ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["profile", "giving", "groups", "discipleship", "attendance"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && !editing && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <Section title="Contact">
              <Field label="Phone" value={member.phone} />
              <Field label="Email" value={member.email} />
              <Field label="Address" value={member.address} />
            </Section>
            <Section title="Personal">
              <Field label="Date of Birth" value={member.date_of_birth} />
              <Field label="Gender" value={member.gender} capitalize />
              <Field label="Marital Status" value={member.marital_status} capitalize />
              <Field label="Occupation" value={member.occupation} />
            </Section>
          </div>
          <div className="space-y-4">
            <Section title="Membership">
              <Field label="Status" value={member.membership_status} capitalize />
              <Field label="Date Joined" value={member.date_joined} />
              <Field label="Baptism" value={member.baptism_status} capitalize />
              <Field label="Baptism Date" value={member.baptism_date} />
              <Field label="Household" value={member.household_name} />
            </Section>
            {member.notes && (
              <Section title="Notes">
                <p className="text-sm text-gray-700 whitespace-pre-line">{member.notes}</p>
              </Section>
            )}
          </div>
        </div>
      )}

      {/* Edit form */}
      {tab === "profile" && editing && (
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <FormField label="First Name *" error={errors.first_name?.message}>
              <input type="text" {...register("first_name")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Middle Name">
              <input type="text" {...register("middle_name")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Last Name *" error={errors.last_name?.message}>
              <input type="text" {...register("last_name")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Gender">
              <select {...register("gender")} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </FormField>
            <FormField label="Date of Birth">
              <input type="date" {...register("date_of_birth")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Marital Status">
              <select {...register("marital_status")} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </FormField>
            <FormField label="Phone">
              <input type="tel" {...register("phone")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <input type="email" {...register("email")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Occupation">
              <input type="text" {...register("occupation")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Membership Status">
              <select {...register("membership_status")} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="visitor">Visitor</option>
                <option value="regular">Regular</option>
                <option value="member">Member</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
            <FormField label="Date Joined">
              <input type="date" {...register("date_joined")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Baptism Status">
              <select {...register("baptism_status")} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="not_baptised">Not Baptised</option>
                <option value="pending">Pending</option>
                <option value="baptised">Baptised</option>
              </select>
            </FormField>
            <FormField label="Baptism Date">
              <input type="date" {...register("baptism_date")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Household">
              <select
                {...register("household", { setValueAs: (v) => v === "" ? null : Number(v) })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">No household</option>
                {households?.results.map((h: Household) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </FormField>
            <div className="col-span-3">
              <FormField label="Address">
                <textarea {...register("address")} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </FormField>
            </div>
            <div className="col-span-3">
              <FormField label="Notes">
                <textarea {...register("notes")} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </FormField>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            {updateMutation.isError && <p className="text-red-500 text-sm self-center">Failed to save.</p>}
          </div>
        </form>
      )}

      {/* Giving tab */}
      {tab === "giving" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!contributions && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
              {contributions?.results.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No contributions yet.</td></tr>}
              {contributions?.results.map((c) => (
                <tr key={c.id} className={c.is_reversal ? "opacity-60" : ""}>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{c.receipt_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.fund_name}</td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${c.is_reversal ? "text-red-600" : "text-gray-900"}`}>
                    GHS {Number(c.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{c.payment_method.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.given_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Groups tab */}
      {tab === "groups" && (
        <div className="space-y-2">
          {!groups && <div className="text-center text-gray-400 py-8">Loading...</div>}
          {groups?.length === 0 && <div className="text-center text-gray-400 py-8">Not a member of any groups.</div>}
          {groups?.map((gm: { id: number; group_name: string; role: string }) => (
            <div key={gm.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{gm.group_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gm.role === "leader" ? "bg-yellow-100 text-yellow-700" : gm.role === "co_leader" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                {gm.role === "co_leader" ? "Co-Leader" : gm.role.charAt(0).toUpperCase() + gm.role.slice(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Attendance tab */}
      {tab === "attendance" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">First Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!attendanceHistory && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              )}
              {attendanceHistory?.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No attendance records found.</td></tr>
              )}
              {attendanceHistory?.map((e: MemberAttendanceEntry) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{e.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.service_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{e.attendance_type}</td>
                  <td className="px-4 py-3 text-center">
                    {e.is_first_visit && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">First Visit</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attendanceHistory && attendanceHistory.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              Showing last {attendanceHistory.length} records
            </div>
          )}
        </div>
      )}

      {/* Discipleship tab */}
      {tab === "discipleship" && (
        <div className="space-y-3">
          {STAGES.map((stage, i) => {
            const record = discipleship?.find((r) => r.stage === stage.key);
            return (
              <div key={stage.key} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-6">
                  <span className="text-xs text-gray-400 font-mono">{i + 1}</span>
                </div>
                <div className={`w-3 h-3 rounded-full shrink-0 ${record ? DISC_COLORS[record.status] : "bg-gray-200"}`} />
                <div className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{stage.label}</span>
                  {record ? (
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${record.status === "completed" ? "bg-green-100 text-green-700" : record.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600"}`}>
                        {record.status === "in_progress" ? "In Progress" : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                      {record.completed_at && <span>Completed {record.completed_at}</span>}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">Not started</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, capitalize }: { label: string; value?: string | null; capitalize?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}

function FormField({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
