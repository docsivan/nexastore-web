"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddressCapture from "@/components/auth/AddressCapture";
import type { CustomerAddress } from "@/lib/customer-auth";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]     = useState<1 | 2>(1);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<Omit<CustomerAddress, "id"> | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "", confirm: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const goToStep2 = () => {
    setError("");
    if (!form.name.trim())             return setError("Full name is required");
    if (!form.phone.trim())            return setError("Phone number is required");
    if (form.password.length < 8)      return setError("Password must be at least 8 characters");
    if (form.password !== form.confirm)return setError("Passwords do not match");
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, password: form.password, address }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Registration failed"); return; }
      router.push("/dashboard");
    } catch { setError("Network error. Please try again."); }
    finally  { setLoading(false); }
  };

  const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors";
  const lbl = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-2xl font-bold text-[#0D0D0D]">Nexa</span>
            <span className="text-2xl font-bold text-[#F5A623]"> Supplies</span>
          </Link>
          <p className="text-sm text-gray-500 mt-1">Healthcare Procurement Platform</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {[{n:1,t:"Account"},{n:2,t:"Delivery"}].map(({n,t}) => (
            <div key={n} className="flex-1">
              <div className={`h-1 rounded-full transition-colors ${step >= n ? "bg-[#0D0D0D]" : "bg-gray-200"}`}/>
              <p className={`text-xs mt-1 text-center ${step === n ? "text-[#0D0D0D] font-medium" : "text-gray-400"}`}>
                {t}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {step === 1 ? (
            <>
              <h2 className="text-lg font-semibold text-[#0D0D0D] mb-5">Create your account</h2>
              <div className="space-y-4">
                <div><label className={lbl}>Full Name *</label>
                  <input className={inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Dr. Ahmed Al Rashdi" />
                </div>
                <div><label className={lbl}>Phone Number *</label>
                  <input className={inp} type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+968 9XXX XXXX" />
                </div>
                <div><label className={lbl}>Email (optional)</label>
                  <input className={inp} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="ahmed@clinic.om" />
                </div>
                <div><label className={lbl}>Password *</label>
                  <input className={inp} type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min. 8 characters" />
                </div>
                <div><label className={lbl}>Confirm Password *</label>
                  <input className={inp} type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="Repeat password" />
                </div>
              </div>
              {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={goToStep2}
                className="w-full mt-5 bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#002a55] transition-colors">
                Continue →
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[#0D0D0D] mb-2">Add delivery address</h2>
              <p className="text-xs text-gray-500 mb-4">We&apos;ll use this as your default delivery address. You can add more later.</p>
              <AddressCapture
                onSave={(a) => { setAddress(a); handleSubmit(); }}
                onSkip={handleSubmit}
                title=""
              />
              {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              {loading && <p className="mt-3 text-sm text-center text-gray-500">Creating your account...</p>}
              <button onClick={() => setStep(1)}
                className="w-full mt-3 text-sm text-gray-500 hover:text-[#0D0D0D] transition-colors">
                ← Back
              </button>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0D0D0D] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
