"use client";
import { useState, useEffect } from "react";
import AddressCapture from "@/components/auth/AddressCapture";
import type { CustomerAddress } from "@/lib/customer-auth";

export default function AddressManager() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [adding,    setAdding]    = useState(false);
  const [loading,   setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/customer/addresses");
      const d = await r.json();
      setAddresses(d.addresses || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setDefault = async (id: string) => {
    await fetch("/api/customer/addresses", {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ id, action: "setDefault" })
    });
    await load();
  };

  const deleteAddr = async (id: string) => {
    if (!confirm("Remove this address?")) return;
    await fetch("/api/customer/addresses", {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ id, action: "delete" })
    });
    await load();
  };

  const addNew = async (a: Omit<CustomerAddress,"id">) => {
    await fetch("/api/customer/addresses", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify(a)
    });
    setAdding(false);
    await load();
  };

  if (loading) return <div className="animate-pulse h-24 bg-gray-100 rounded-xl"/>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#0D0D0D] text-sm">Delivery Addresses</h3>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="text-xs text-[#F5A623] font-medium hover:underline">
            + Add address
          </button>
        )}
      </div>

      {addresses.length === 0 && !adding && (
        <div className="text-center py-6 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500 mb-3">No delivery addresses saved yet.</p>
          <button onClick={() => setAdding(true)}
            className="text-sm bg-[#0D0D0D] text-white px-4 py-2 rounded-lg hover:bg-[#002a55]">
            Add Your Address
          </button>
        </div>
      )}

      <div className="space-y-3">
        {addresses.map(a => (
          <div key={a.id} className={`border rounded-xl p-4 transition-colors ${a.isDefault ? "border-[#0D0D0D] bg-blue-50/40" : "border-gray-200"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#0D0D0D] bg-blue-100 px-2 py-0.5 rounded-full">{a.label}</span>
                  {a.isDefault && <span className="text-xs font-medium text-[#F5A623]">✓ Default</span>}
                </div>
                <p className="text-sm text-gray-700">
                  {[a.building, a.street, a.area, a.wilayat, a.governorate].filter(Boolean).join(", ")}
                </p>
                {a.phone && <p className="text-xs text-gray-500 mt-0.5">{a.phone}</p>}
              </div>
              <div className="flex flex-col gap-1 items-end ml-3">
                {!a.isDefault && (
                  <button onClick={() => setDefault(a.id)}
                    className="text-xs text-[#0D0D0D] hover:underline whitespace-nowrap">Set default</button>
                )}
                <button onClick={() => deleteAddr(a.id)}
                  className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-4">
          <AddressCapture
            onSave={addNew}
            onSkip={() => setAdding(false)}
            title="New delivery address"
          />
        </div>
      )}
    </div>
  );
}
