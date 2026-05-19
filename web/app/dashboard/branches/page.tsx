"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranches, type Branch } from "@/lib/api/branches";

export default function BranchesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["branches", page],
    queryFn: () => getBranches({ page }),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Branches</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <div className="col-span-full p-8 text-center text-gray-500">Loading branches...</div>
        )}
        {isError && (
          <div className="col-span-full p-8 text-center text-red-500">Failed to load branches.</div>
        )}
        {data?.results.map((branch: Branch) => (
          <div key={branch.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900">{branch.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${branch.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {branch.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono">{branch.code}</p>
            {(branch.city || branch.country) && (
              <p className="text-sm text-gray-600">
                {[branch.city, branch.region, branch.country].filter(Boolean).join(", ")}
              </p>
            )}
            {branch.phone && <p className="text-sm text-gray-600">{branch.phone}</p>}
            {branch.email && <p className="text-sm text-blue-600">{branch.email}</p>}
          </div>
        ))}
        {data?.results.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-400">No branches found.</div>
        )}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data.count} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.previous}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.next}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
