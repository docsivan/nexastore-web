from pathlib import Path
import sys
PROJECT = Path.cwd()
SKIP_DIRS = {".git","node_modules",".next",".vercel"}
SCAN_EXTS = {".ts",".tsx",".js",".jsx",".mjs"}
REPLACEMENTS = [
    ("/api/haya/chat",       "/api/nexa/chat",       "Nexa AI chat endpoint"),
    ("/api/haya/",           "/api/nexa/",            "All haya API paths"),
    ("hayat_admin_session",  "nexa_admin_session",    "Staff JWT cookie"),
    ('"hs_customer"',        '"ns_customer"',         "Customer cookie (double-quoted)"),
    ("'hs_customer'",        "'ns_customer'",         "Customer cookie (single-quoted)"),
    ("hs_customer",          "ns_customer",           "Customer cookie (bare)"),
]
if not (PROJECT/"package.json").exists():
    print(f"ERROR: Run from nexastore-web (currently: {PROJECT})"); sys.exit(1)
print(f"\n{'='*60}\n  NexaStore Bug Fix Script — Session 22\n  Project: {PROJECT}\n{'='*60}\n")
total_files = 0
total_changes = 0
for filepath in sorted(PROJECT.rglob("*")):
    if not filepath.is_file(): continue
    if any(p in filepath.parts for p in SKIP_DIRS): continue
    if filepath.name.startswith(".env"): continue
    if filepath.suffix not in SCAN_EXTS: continue
    try: original = filepath.read_text(encoding="utf-8")
    except: continue
    updated = original
    file_log = []
    for old,new,desc in REPLACEMENTS:
        if old in updated:
            count = updated.count(old)
            updated = updated.replace(old,new)
            file_log.append((desc,old,new,count))
            total_changes += count
    if updated != original:
        filepath.write_text(updated,encoding="utf-8")
        print(f"  FIXED: {filepath.relative_to(PROJECT)}")
        for desc,old,new,count in file_log:
            print(f"    [{desc}] {old!r} -> {new!r} ({count}x)")
        total_files += 1
print(f"\n  Files changed: {total_files}  |  Total replacements: {total_changes}\n")
