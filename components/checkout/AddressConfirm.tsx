"use client";
/**
 * Checkout address confirmation — shown on every return visit.
 * Fetches saved default address, asks customer to confirm or change.
 */
import { useState, useEffect } from "react";
import type { CustomerAddress } from "@/lib/customer-auth";

interface Props {
  onConfirm: (a: CustomerAddress) => void;
  onAddNew:  () => void;
}

export default function AddressConfirm({ onConfirm, onAddNew }: Props) {
  const [addresses,  setAddresses]  = useState<CustomerAddress[]>([]);
  const [selected,   setSelected]   = useState<string>("");
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetch("/api/customer/addresses").then(r=>r.json()).then(d=>{
      const addrs = d.addresses || [];
      setAddresses(addrs);
      const def = addrs.find((a: CustomerAddress) => a.isDefault);
      if (def) setSelected(def.id);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded-xl"/>;
  if (!addresses.length) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
      <p className="text-sm text-amber-700 mb-2">No delivery address saved.</p>
      <button onClick={onAddNew} className="text-sm text-[#0D0D0D] font-medium hover:underline">+ Add address</button>
    </div>
  );

  const chosen = addresses.find(a => a.id === selected);

  return (
    <div className="bg-blue-50/60 border border-[#0D0D0D]/20 rounded-xl p-4">
      <p className="text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-3">Deliver to</p>
      <div className="space-y-2 mb-3">
        {addresses.map(a => (
          <label key={a.id}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected === a.id ? "border-[#0D0D0D] bg-white" : "border-gray-200 bg-white/60"}`}>
            <input type="radio" name="address" value={a.id} checked={selected===a.id}
              onChange={()=>setSelected(a.id)} className="mt-0.5 accent-[#0D0D0D]"/>
            <div>
              <span className="text-xs font-semibold text-[#0D0D0D] mr-2">{a.label}</span>
              <p className="text-sm text-gray-700">
                {[a.building, a.street, a.area, a.wilayat, a.governorate].filter(Boolean).join(", ")}
              </p>
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => chosen && onConfirm(chosen)}
          className="flex-1 bg-[#0D0D0D] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#002a55]">
          Confirm Address
        </button>
        <button onClick={onAddNew}
          className="px-4 text-sm text-[#0D0D0D] border border-[#0D0D0D]/30 rounded-xl hover:bg-blue-50">
          + New
        </button>
      </div>
    </div>
  );
}
