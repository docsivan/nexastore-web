"use client";
/**
 * NexaStore — Address Capture
 * Uses browser Geolocation API + Nominatim (OpenStreetMap) reverse geocoding.
 * Zero API keys. Zero map plugins.
 */
import { useState } from "react";
import type { CustomerAddress } from "@/lib/customer-auth";

const GOVERNORATES = ["Muscat","Dhofar","Musandam","Al Buraimi","Ad Dakhiliyah",
  "Al Batinah North","Al Batinah South","Al Sharqiyah North","Al Sharqiyah South",
  "Al Dhahirah","Al Wusta"];

interface Props {
  onSave: (a: Omit<CustomerAddress, "id">) => void;
  onSkip?: () => void;
  initial?: Partial<CustomerAddress>;
  title?: string;
}

export default function AddressCapture({ onSave, onSkip, initial, title = "Add delivery address" }: Props) {
  const [detecting, setDetecting] = useState(false);
  const [geoMsg,    setGeoMsg]    = useState("");
  const [form, setForm] = useState({
    label:       initial?.label       || "Clinic",
    building:    initial?.building    || "",
    street:      initial?.street      || "",
    area:        initial?.area        || "",
    wilayat:     initial?.wilayat     || "",
    governorate: initial?.governorate || "Muscat",
    phone:       initial?.phone       || "",
    lat:         initial?.lat,
    lng:         initial?.lng,
    isDefault:   initial?.isDefault   ?? true,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setGeoMsg("Geolocation not supported in this browser.");
      return;
    }
    setDetecting(true);
    setGeoMsg("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGeoMsg("Fetching address...");
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { "User-Agent": "NexaSupplies/1.0 nexastore.io" } }
          );
          const geo = await r.json();
          const a = geo.address || {};
          setForm(f => ({
            ...f,
            building:    a.house_number || a.amenity || a.shop || f.building,
            street:      a.road || a.street || a.path || f.street,
            area:        a.suburb || a.neighbourhood || a.quarter || a.village || f.area,
            wilayat:     a.city_district || a.district || a.town || a.city || f.wilayat,
            governorate: GOVERNORATES.find(g =>
              (a.state || "").toLowerCase().includes(g.toLowerCase())
            ) || "Muscat",
            lat, lng,
          }));
          setGeoMsg("✅ Location detected — please review and confirm below.");
        } catch {
          setGeoMsg("Could not fetch address. Please fill in manually.");
        }
        setDetecting(false);
      },
      (err) => {
        setGeoMsg(err.code === 1
          ? "Location access denied. Please allow location or fill in manually."
          : "Could not detect location. Please fill in manually.");
        setDetecting(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleSave = () => {
    if (!form.building && !form.street) {
      setGeoMsg("Please enter at least building/street details.");
      return;
    }
    onSave(form);
  };

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors";
  const lbl = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-[#0D0D0D] text-base mb-4">{title}</h3>

      {/* Detect location button */}
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className="w-full flex items-center justify-center gap-2 bg-[#0D0D0D] text-white rounded-xl py-3 text-sm font-medium mb-4 disabled:opacity-60 hover:bg-[#002a55] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        {detecting ? "Detecting..." : "Use My Current Location"}
      </button>

      {geoMsg && (
        <p className={`text-xs mb-4 px-3 py-2 rounded-lg ${geoMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          {geoMsg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Label */}
        <div className="col-span-2">
          <label className={lbl}>Address Label</label>
          <div className="flex gap-2">
            {["Clinic","Hospital","Home","Office"].map(l => (
              <button key={l} type="button"
                onClick={() => set("label", l)}
                className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                  form.label === l
                    ? "bg-[#0D0D0D] text-white border-[#0D0D0D]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#0D0D0D]"
                }`}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Building */}
        <div>
          <label className={lbl}>Building / Villa No.</label>
          <input className={inp} value={form.building} onChange={e => set("building", e.target.value)} placeholder="Building 12" />
        </div>

        {/* Street */}
        <div>
          <label className={lbl}>Street / Road</label>
          <input className={inp} value={form.street} onChange={e => set("street", e.target.value)} placeholder="Al Noor Street" />
        </div>

        {/* Area */}
        <div>
          <label className={lbl}>Area / Neighbourhood</label>
          <input className={inp} value={form.area} onChange={e => set("area", e.target.value)} placeholder="Al Khuwair" />
        </div>

        {/* Wilayat */}
        <div>
          <label className={lbl}>Wilayat</label>
          <input className={inp} value={form.wilayat} onChange={e => set("wilayat", e.target.value)} placeholder="Bausher" />
        </div>

        {/* Governorate */}
        <div className="col-span-2">
          <label className={lbl}>Governorate</label>
          <select className={inp} value={form.governorate} onChange={e => set("governorate", e.target.value)}>
            {GOVERNORATES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>

        {/* Phone */}
        <div className="col-span-2">
          <label className={lbl}>Contact Phone (optional)</label>
          <input className={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+968 9XXX XXXX" />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button type="button" onClick={handleSave}
          className="flex-1 bg-[#F5A623] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#43A047] transition-colors">
          Save Address
        </button>
        {onSkip && (
          <button type="button" onClick={onSkip}
            className="px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
