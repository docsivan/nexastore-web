from pathlib import Path
import sys
PROJECT = Path.cwd()
SKIP_DIRS = {".git","node_modules",".next",".vercel"}
SCAN_EXTS = {".ts",".tsx",".js",".jsx",".mjs"}
PATTERNS = [
    ("/api/haya/",          "Bug 1 — Nexa AI: old API path"),
    ("hayat_admin_session", "Bug 2 — Staff login: old JWT cookie"),
    ("hs_customer",         "Bug 3 — My Account: old customer cookie"),
    ("IS_TRUE(",            "Bonus — Airtable IS_TRUE() will break"),
]
if not (PROJECT/"package.json").exists():
    print(f"ERROR: Run from nexastore-web (currently: {PROJECT})"); sys.exit(1)
print(f"\n{'='*60}\n  NexaStore Diagnostic Scanner\n  Project: {PROJECT}\n{'='*60}\n")
found_any = False
for pattern, label in PATTERNS:
    hits = []
    for f in sorted(PROJECT.rglob("*")):
        if not f.is_file(): continue
        if any(p in f.parts for p in SKIP_DIRS): continue
        if f.suffix not in SCAN_EXTS: continue
        try: lines = f.read_text(encoding="utf-8").splitlines()
        except: continue
        for i,line in enumerate(lines,1):
            if pattern in line:
                hits.append((f.relative_to(PROJECT),i,line.strip()))
    if hits:
        found_any = True
        print(f"  FOUND: {label}\n  Pattern: {pattern!r}")
        for rel,lineno,text in hits:
            print(f"    {rel}:{lineno}  =>  {text[:80]}")
        print()
if not found_any:
    print("  All clean — no stale references found.")
api_dir = PROJECT/"app"/"api"
if api_dir.exists():
    children = sorted([d.name for d in api_dir.iterdir() if d.is_dir()])
    print(f"\n  app/api/ folders: {children}")
