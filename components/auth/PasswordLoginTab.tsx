"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PasswordLoginTab() {
  const router = useRouter();
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login-password", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ phone, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Login failed"); return; }
      router.push("/dashboard");
    } catch { setError("Network error. Try again."); }
    finally  { setLoading(false); }
  };

  const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D0D0D]";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
        <input className={inp} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+968 9XXX XXXX" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <input className={inp} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <button onClick={handle} disabled={loading}
        className="w-full bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#002a55] disabled:opacity-60 transition-colors">
        {loading ? "Signing in..." : "Sign In"}
      </button>
      <p className="text-center text-xs text-gray-500">
        New customer? <a href="/register" className="text-[#0D0D0D] font-medium hover:underline">Create account</a>
      </p>
    </div>
  );
}
