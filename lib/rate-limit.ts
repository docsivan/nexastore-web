type Entry = { count: number; firstHit: number; locked?: number };
const store = new Map<string, Entry>();
export interface RLConfig { limit: number; windowMs: number; blockMs?: number; }
export const RATE_CONFIGS = {
  auth:  { limit: 10,  windowMs: 60_000,  blockMs: 300_000 } as RLConfig,
  admin: { limit: 5,   windowMs: 300_000, blockMs: 900_000 } as RLConfig,
  chat:  { limit: 30,  windowMs: 60_000  } as RLConfig,
  cron:  { limit: 5,   windowMs: 60_000  } as RLConfig,
  api:   { limit: 120, windowMs: 60_000  } as RLConfig,
};
export interface RLResult { ok: boolean; remaining: number; resetIn: number; blocked: boolean; }
export function checkRateLimit(key: string, cfg: RLConfig): RLResult {
  const now = Date.now();
  const { limit, windowMs, blockMs = windowMs } = cfg;
  if (Math.random() < 0.002) Array.from(store.entries()).forEach(([k,v]) => { if (now-v.firstHit > blockMs+windowMs) store.delete(k) });
  const e = store.get(key);
  if (!e) { store.set(key,{count:1,firstHit:now}); return {ok:true,remaining:limit-1,resetIn:Math.ceil(windowMs/1000),blocked:false}; }
  if (e.locked !== undefined) {
    const unlock = e.locked+blockMs;
    if (now < unlock) return {ok:false,remaining:0,resetIn:Math.ceil((unlock-now)/1000),blocked:true};
    store.set(key,{count:1,firstHit:now}); return {ok:true,remaining:limit-1,resetIn:Math.ceil(windowMs/1000),blocked:false};
  }
  if (now-e.firstHit > windowMs) { store.set(key,{count:1,firstHit:now}); return {ok:true,remaining:limit-1,resetIn:Math.ceil(windowMs/1000),blocked:false}; }
  e.count++;
  if (e.count > limit) { e.locked=now; return {ok:false,remaining:0,resetIn:Math.ceil(blockMs/1000),blocked:true}; }
  return {ok:true,remaining:limit-e.count,resetIn:Math.ceil((e.firstHit+windowMs-now)/1000),blocked:false};
}
export function getClientIp(req: Request): string {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
export const rlKey = (ip: string, route: string) => `${ip}:${route}`;
export function rlResponse(resetIn: number, blocked: boolean): Response {
  return new Response(JSON.stringify({error: blocked ? "Too many attempts — access temporarily blocked" : "Too many requests", retryAfter: resetIn}),
    {status:429, headers:{"Content-Type":"application/json","Retry-After":String(resetIn)}});
}
