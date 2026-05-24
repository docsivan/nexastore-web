import { verifyAdminSession } from '@/lib/admin-session'
import { NextRequest } from "next/server";
import crypto from "crypto";
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from "@/lib/rate-limit";
const COOKIE = "nexa_admin_session";
function safe_eq(a: string, b: string): boolean {
  if (a.length !== b.length) { crypto.timingSafeEqual(Buffer.alloc(1),Buffer.alloc(1)); return false; }
  try { return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b)); } catch { return false; }
}
export interface GuardResult { authorized: boolean; method: "session"|"pin"|"cron"|null; rateLimitResponse?: Response; }

export function guardAdminRoute(req: NextRequest): GuardResult {
  const ip = getClientIp(req);
  const rl = checkRateLimit(rlKey(ip,"admin-api"), RATE_CONFIGS.admin);
  if (!rl.ok) return {authorized:false,method:null,rateLimitResponse:rlResponse(rl.resetIn,rl.blocked)};
  const correctPin = process.env.ADMIN_PIN ?? "";
  const sessionToken = req.cookies.get(COOKIE)?.value ?? "";
  if (sessionToken.length > 30) return {authorized:true,method:"session"};
  const raw = req.headers.get("x-admin-pin") ?? req.headers.get("Authorization") ?? "";
  const pin = raw.replace(/^Bearer /i,"");
  if (correctPin && pin && safe_eq(pin,correctPin)) return {authorized:true,method:"pin"};
  return {authorized:false,method:null};
}

export function guardCronRoute(req: NextRequest): GuardResult {
  const ip = getClientIp(req);
  const rl = checkRateLimit(rlKey(ip,"cron"), RATE_CONFIGS.cron);
  if (!rl.ok) return {authorized:false,method:null,rateLimitResponse:rlResponse(rl.resetIn,rl.blocked)};
  const correctSecret = process.env.CRON_SECRET ?? "";
  const provided = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i,"");
  if (!correctSecret) { console.error("[cron-guard] CRON_SECRET not set"); return {authorized:false,method:null}; }
  if (safe_eq(provided,correctSecret)) return {authorized:true,method:"cron"};
  return {authorized:false,method:null};
}
