import json,time,urllib.request,os
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
KEY=load_env().get("AIRTABLE_API_KEY","")
BASE="appaVFVbwG9MkoDa9"; TABLE="Products"
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}
CATS=[
  ("Skincare",["CeraVe","La Roche-Posay","Cetaphil","Neutrogena","Vichy"],
   ["Hydrating Daily Moisturiser SPF 15","Gentle Foaming Cleanser","Balancing Rose Toner Mist","Nourishing Night Cream","Refreshing Eye Gel","Deep Pore Cleansing Mask","Sensitive Skin Daily Cream","Brightening Vitamin C Face Wash","Oil-Free Gel Moisturiser","Rich Shea Butter Face Cream","Micellar Cleansing Water","Exfoliating Face Scrub","Anti-Ageing Day Cream SPF 20","Hydrating Face Mist","Overnight Recovery Sleeping Mask","Gentle Eye Makeup Remover","Multi-Action BB Cream SPF 30","Soothing Aloe Vera Face Gel","Pore-Refining Primer","Firming Neck Cream","Revitalising Rose Water Toner","Deep Cleansing Charcoal Mask","Lightweight Gel-Cream Moisturiser","Anti-Fatigue Eye Cream","Brightening Day Serum SPF 25"]),
  ("Serums & Actives",["The Ordinary","Paula's Choice","Skinceuticals","COSRX","Drunk Elephant"],
   ["20% Vitamin C Brightening Serum","0.3% Retinol Renewal Serum","Hyaluronic Acid 2% Serum","Niacinamide 10% + Zinc 1%","AHA 30% + BHA 2% Peeling Solution","Peptide Complex Firming Serum","Resveratrol 3% Antioxidant Serum","Azelaic Acid 10% Brightening","Glycolic Acid 7% Toning Solution","Lactic Acid 10% + HA Serum","Bakuchiol 0.5% Retinol Alternative","Alpha Arbutin 2% Dark Spot Serum","EGF Growth Factor Serum","Ceramide Barrier Repair Serum","Salicylic Acid 2% Solution","Tranexamic Acid 5% Serum","Copper Peptide 1% Serum","Idebenone Antioxidant Serum","Mandelic Acid 10% Serum","Polyglutamic Acid 2% Serum"]),
  ("Sun Care",["ISDIN","La Roche-Posay","Altruist","Bondi Sands","Sun Bum"],
   ["SPF 50+ Invisible Fluid Sunscreen","SPF 30 Daily Moisturising Sunscreen","Mineral SPF 50 Tinted Sunscreen","SPF 50 Sport Water-Resistant","After Sun Soothing Gel","SPF 50+ Kids Sunscreen Lotion","Invisible SPF 30 Face Mist","Broad Spectrum SPF 50 Cream","SPF 50 Oil-Free Mattifying","After Sun Tan Extender Lotion","SPF 50+ Sensitive Skin","Self-Tanning Gradual Lotion","SPF 30 Lip Balm Vitamin E","Daily UV Defence Fluid SPF 50","SPF 50 Bronzing Sunscreen Oil"]),
  ("Body & Hair",["Palmer's","The Body Shop","Moroccanoil","OGX","Dove"],
   ["Shea Butter Body Lotion","Coffee Body Scrub","Argan Oil Hair Serum","Coconut Vanilla Body Oil","Moisturising Body Wash","Keratin Repair Shampoo","Hydrating Argan Conditioner","Exfoliating Sugar Body Scrub","Firming Body Butter","Scalp Treatment Serum","Coconut Oil Body Polish","Hair Growth Vitamin Serum","Brightening Body Milk SPF 15","Anti-Cellulite Firming Oil","Hydrating Deep Hair Mask"]),
  ("Pro Tools",["NuFace","FOREO","Mount Lai","BeautyBio","PMD"],
   ["Derma Roller 0.5mm 540 Needles","LED Light Therapy Face Mask","Ultrasonic Facial Steamer","Gua Sha Rose Quartz Tool","T-Bar Facial Massage Roller","EMS Microcurrent Face Lift Device","Sonic Facial Cleansing Brush","Ice Globes Face Massage Set","RF Skin Tightening Device","Jade Roller & Gua Sha Set","Nano Mist Facial Sprayer","High-Frequency Ozone Wand"]),
  ("Cosmetics",["Fenty Beauty","Charlotte Tilbury","NARS","Rare Beauty","MAC"],
   ["Full Coverage Foundation SPF 15","Hydrating Tinted Moisturiser","Longwear Concealer","Setting Powder Translucent","Contour & Highlight Palette","Precision Brow Pencil","Volumising Mascara Black","Satin Lip Colour","Plumping Lip Gloss","Eyeshadow Palette 12 Shades","Liquid Eyeliner Precision","Blush & Bronzer Duo","Setting Spray Long Lasting"]),
]
flat=[]
for cat,brands,names in CATS:
    for i,name in enumerate(names):
        flat.append({"category":cat,"name":name,"brand":brands[i%len(brands)],"pack_size":"1 unit"})
def get_all():
    recs=[]; offset=None
    while True:
        url=f"https://api.airtable.com/v0/{BASE}/{TABLE}?pageSize=100"
        if offset: url+=f"&offset={offset}"
        req=urllib.request.Request(url,headers=H)
        with urllib.request.urlopen(req) as r: data=json.loads(r.read())
        recs.extend(data.get("records",[])); offset=data.get("offset")
        if not offset: break
        time.sleep(0.25)
    return recs
def patch(batch):
    url=f"https://api.airtable.com/v0/{BASE}/{TABLE}"
    body=json.dumps({"records":batch}).encode()
    req=urllib.request.Request(url,data=body,headers=H,method="PATCH")
    with urllib.request.urlopen(req) as r: return json.loads(r.read())
print("Fetching 100 products...")
records=get_all(); print(f"Found {len(records)} products\n")
assignments=[{"id":r["id"],"fields":flat[i%len(flat)]} for i,r in enumerate(records)]
total=0
for i in range(0,len(assignments),10):
    try:
        patch(assignments[i:i+10]); total+=min(10,len(assignments)-i)
        print(f"  Updated {total}/{len(assignments)}")
        time.sleep(0.25)
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()}"); time.sleep(1)
print(f"\nDone — {total}/100 products updated")
print("Categories assigned: Skincare, Serums & Actives, Sun Care, Body & Hair, Pro Tools, Cosmetics")
