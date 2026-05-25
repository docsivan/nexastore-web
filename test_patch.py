import json,urllib.request,os
from pathlib import Path
def load_env():
    e={}
    try:
        for l in Path(".env.local").read_text().splitlines():
            l=l.strip()
            if l and not l.startswith("#") and "=" in l:
                k,_,v=l.partition("="); e[k.strip()]=v.strip().strip('"').strip("'")
    except: pass
    return e
env=load_env()
KEY=env.get("AIRTABLE_API_KEY","")
BASE="appaVFVbwG9MkoDa9"; TABLE="Products"
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}
# Step 1: get first record id
url=f"https://api.airtable.com/v0/{BASE}/{TABLE}?pageSize=1"
req=urllib.request.Request(url,headers=H)
with urllib.request.urlopen(req) as r: data=json.loads(r.read())
rec=data["records"][0]
rec_id=rec["id"]
existing_fields=list(rec["fields"].keys())
print(f"Record ID: {rec_id}")
print(f"Existing fields: {existing_fields}")
# Step 2: try minimal patch - name only
print("\nTesting PATCH with name only...")
url2=f"https://api.airtable.com/v0/{BASE}/{TABLE}"
body=json.dumps({"records":[{"id":rec_id,"fields":{"name":"TEST Serum"}}]}).encode()
req2=urllib.request.Request(url2,data=body,headers=H,method="PATCH")
try:
    with urllib.request.urlopen(req2) as r: print(f"SUCCESS: {r.status}")
except urllib.error.HTTPError as e:
    print(f"FAILED {e.code}: {e.read().decode()}")
