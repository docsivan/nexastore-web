import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from "@/lib/rate-limit";
const PROD = process.env.NODE_ENV === "production";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";
function addSec(res: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-eval' https://www.googletagmanager.com https://www.clarity.ms https://cdn.vercel-insights.com https://va.vercel-scripts.com https://scripts.clarity.ms",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://dl.airtable.com https://*.airtable.com https://www.google-analytics.com https://images.unsplash.com https://plus.unsplash.com",
    "connect-src 'self' https://api.airtable.com https://hook.eu1.make.com https://hook.eu2.make.com https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://generativelanguage.googleapis.com https://api.anthropic.com",
    "frame-ancestors 'none'","form-action 'self'","object-src 'none'","base-uri 'self'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options","nosniff");
  res.headers.set("X-Frame-Options","DENY");
  res.headers.set("X-XSS-Protection","1; mode=block");
  res.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  if (PROD) res.headers.set("Strict-Transport-Security","max-age=63072000; includeSubDomains; preload");
  return res;
}
function originOk(req: NextRequest): boolean {
  if (!PROD) return true;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  if (!origin && !referer) return false;
  if (origin && SITE && !origin.startsWith(SITE)) return false;
  return true;
}
// Admin sub-pages accessible without auth (PIN login is at /admin itself)
const ADMIN_PUBLIC = ['/admin/forgot-password', '/admin/reset-password']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // Guard /admin/* sub-routes — redirect to /admin (PIN login) when not authenticated
  if (pathname.startsWith('/admin/') && !ADMIN_PUBLIC.some(p => pathname.startsWith(p))) {
    const authed = req.cookies.get('adminAuth')?.value === 'true'
    if (!authed) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }
  if (pathname.startsWith("/api/auth/")) {
    const rl = checkRateLimit(rlKey(ip,"auth"), RATE_CONFIGS.auth);
    if (!rl.ok) return addSec(new NextResponse(JSON.stringify({error:"Too many requests"}),{status:429}) as NextResponse);
  }
  if (pathname === "/api/admin/auth") {
    const rl = checkRateLimit(rlKey(ip,"admin-auth"), RATE_CONFIGS.admin);
    if (!rl.ok) return addSec(new NextResponse(JSON.stringify({error:"Too many attempts"}),{status:429}) as NextResponse);
  }
  if (pathname.startsWith("/api/chat") || pathname.startsWith("/api/nexa")) {
    const rl = checkRateLimit(rlKey(ip,"chat"), RATE_CONFIGS.chat);
    if (!rl.ok) return addSec(new NextResponse(JSON.stringify({error:"Too many requests"}),{status:429}) as NextResponse);
  }
  if (pathname.startsWith("/api/")) {
    const rl = checkRateLimit(rlKey(ip,"api"), RATE_CONFIGS.api);
    if (!rl.ok) return addSec(new NextResponse(JSON.stringify({error:"Too many requests"}),{status:429}) as NextResponse);
  }
  if (pathname.startsWith("/api/") && ["POST","PUT","DELETE","PATCH"].includes(req.method) && !pathname.startsWith("/api/payment/callback") && !pathname.startsWith("/api/chat")) {
    if (!originOk(req)) return addSec(new NextResponse(JSON.stringify({error:"Forbidden"}),{status:403,headers:{"Content-Type":"application/json"}}) as NextResponse);
  }
  return addSec(NextResponse.next());
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
