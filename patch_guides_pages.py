import os, sys
from pathlib import Path
PROJECT = Path.cwd()
if not (PROJECT / "package.json").exists():
    print(f"ERROR: Run from ~/Desktop/nexastore-web"); sys.exit(1)
def write(rel, content):
    path = PROJECT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"  WROTE  {rel}")
print(f"\n{'='*55}\n  NexaStore — Guides Pages\n  Project: {PROJECT}\n{'='*55}\n")

write("app/guides/page.tsx", """\
import { Metadata } from 'next'
import Link from 'next/link'
export const revalidate = 3600
export const metadata: Metadata = {
  title: 'Skincare & Beauty Guides | NexaStore',
  description: 'Expert guides on skincare routines, active ingredients, sun protection, body care and professional tools.',
}
interface Guide { content_id:string; title:string; meta_description:string; category:string; word_count:number }
const COLORS:Record<string,{bg:string;text:string}> = {
  'Skincare':        {bg:'#F5A62320',text:'#F5A623'},
  'Serums & Actives':{bg:'#9B59B620',text:'#C39BD3'},
  'Sun Care':        {bg:'#E67E2220',text:'#F0A500'},
  'Body & Hair':     {bg:'#27AE6020',text:'#58D68D'},
  'Pro Tools':       {bg:'#2980B920',text:'#5DADE2'},
  'Cosmetics':       {bg:'#E91E6320',text:'#F48FB1'},
}
const STATIC:Guide[] = [
  {content_id:'skincare-routine-guide',    title:'The Complete Guide to Building a Skincare Routine',   meta_description:'Step-by-step guide to cleansing, toning, serums, moisturising and SPF for any skin type.',  category:'Skincare',         word_count:870},
  {content_id:'serums-actives-guide',      title:'Understanding Serums and Active Ingredients',          meta_description:'Everything about vitamin C, retinol, hyaluronic acid, niacinamide, AHAs and BHAs.',        category:'Serums & Actives', word_count:850},
  {content_id:'sun-protection-guide',      title:'Sun Protection 101: SPF, UVA and UVB Explained',      meta_description:'SPF numbers, UVA vs UVB, chemical vs mineral sunscreen explained.',                        category:'Sun Care',         word_count:720},
  {content_id:'body-care-guide',           title:'Body Care Essentials: The Complete Routine',           meta_description:'From body wash and scrubs to moisturisers and hair serums.',                               category:'Body & Hair',      word_count:680},
  {content_id:'pro-skincare-tools',        title:'Professional Skincare Tools That Actually Work',       meta_description:'A no-hype guide to derma rollers, LED masks, microcurrent devices and gua sha.',          category:'Pro Tools',        word_count:800},
  {content_id:'cosmetics-guide',           title:'Cosmetics and Colour: Choosing Products for Your Skin',meta_description:'How to choose foundation, concealer and colour cosmetics for your skin type.',            category:'Cosmetics',        word_count:740},
]
async function fetchGuides():Promise<Guide[]> {
  const base=process.env.AIRTABLE_BASE_ID; const key=process.env.AIRTABLE_API_KEY
  if(!base||!key) return STATIC
  try {
    const f=encodeURIComponent("AND({status}='published',{content_tier}='pillar')")
    const res=await fetch(`https://api.airtable.com/v0/${base}/Haya_Content?filterByFormula=${f}`,{headers:{Authorization:`Bearer ${key}`},next:{revalidate:3600}})
    if(!res.ok) return STATIC
    const data=await res.json()
    const recs=data.records?.map((r:{fields:Guide})=>r.fields)||[]
    return recs.length>0?recs:STATIC
  } catch { return STATIC }
}
export default async function GuidesPage() {
  const guides=await fetchGuides()
  return (
    <main className="min-h-screen bg-[#0D0D0D] text-white">
      <section className="border-b border-[#2A2A2A] py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#F5A623] text-sm font-semibold tracking-widest uppercase mb-3">Knowledge Hub</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Skincare &amp; Beauty Guides</h1>
          <p className="text-[#A0A0A0] text-lg max-w-2xl mx-auto">Expert guides to help you understand ingredients, build routines, and find products that work.</p>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map(g=>{
            const c=COLORS[g.category]||{bg:'#F5A62320',text:'#F5A623'}
            return (
              <Link key={g.content_id} href={`/guides/${g.content_id}`} className="group block bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#F5A623] transition-all duration-200">
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{backgroundColor:c.bg,color:c.text}}>{g.category}</span>
                <h2 className="text-white font-semibold text-lg mb-3 group-hover:text-[#F5A623] transition-colors leading-snug">{g.title}</h2>
                <p className="text-[#A0A0A0] text-sm leading-relaxed mb-5">{g.meta_description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
                  <span className="text-[#555] text-xs">{g.word_count} words</span>
                  <span className="text-[#F5A623] text-sm font-medium group-hover:underline">Read guide →</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
      <section className="border-t border-[#2A2A2A] bg-[#111] py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Not sure which product to choose?</h2>
            <p className="text-[#A0A0A0] text-sm">Our comparison guides break down the differences.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/compare/physical-vs-chemical-sunscreen" className="bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:border-[#F5A623] hover:text-[#F5A623] transition-all">Sunscreen comparison →</Link>
            <Link href="/compare/vitamin-c-vs-niacinamide" className="bg-[#F5A623] text-black text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#E09000] transition-colors">Vitamin C vs Niacinamide →</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
""")

write("app/guides/[slug]/page.tsx", """\
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
export const revalidate = 3600
interface Content { content_id:string; title:string; meta_title:string; meta_description:string; category:string; body:string; faq_schema:string; keywords:string; word_count:number }
const STATIC:Record<string,Partial<Content>> = {
  'skincare-routine-guide':{title:'The Complete Guide to Building a Skincare Routine',meta_title:'How to Build a Skincare Routine',meta_description:'Step-by-step guide for any skin type.',category:'Skincare',word_count:870,body:'## The Core Steps\n\nA skincare routine works when you apply the right products in the right order: cleanse, treat, moisturise, protect.\n\n## Step 1: Cleanser\n\nGentle cleanser morning and evening. Gel for oily skin, cream for dry skin, fragrance-free for sensitive.\n\n## Step 2: Toner\n\nBalances pH and preps skin. Hyaluronic acid for hydration, niacinamide for pore refinement.\n\n## Step 3: Serum\n\nTargeted treatment. Vitamin C for pigmentation, retinol for lines, hyaluronic acid for hydration.\n\n## Step 4: Moisturiser\n\nAll skin types need it. Gel for oily, rich cream for dry.\n\n## Step 5: SPF\n\nSPF 30 minimum every morning. UV causes 80% of visible skin ageing.'},
  'serums-actives-guide':{title:'Understanding Serums and Active Ingredients',meta_title:'Serums and Active Ingredients Guide',meta_description:'Vitamin C, retinol, hyaluronic acid and more explained.',category:'Serums & Actives',word_count:850,body:'## Vitamin C\n\nBrightens and fades dark spots. Use morning. 10-20% concentration.\n\n## Retinol\n\nAnti-ageing gold standard. Use at night only. Start once per week.\n\n## Hyaluronic Acid\n\nDraws water into skin. Apply to damp skin then seal with moisturiser.\n\n## Niacinamide\n\nPores, oil control, pigmentation, barrier. Very well tolerated by all skin types.\n\n## AHAs and BHAs\n\nExfoliate 2-3 times per week. Always follow with SPF.'},
}
async function fetchContent(slug:string):Promise<Content|null> {
  const base=process.env.AIRTABLE_BASE_ID; const key=process.env.AIRTABLE_API_KEY
  if(base&&key) {
    try {
      const f=encodeURIComponent(`AND({content_id}='${slug}',{status}='published')`)
      const res=await fetch(`https://api.airtable.com/v0/${base}/Haya_Content?filterByFormula=${f}&maxRecords=1`,{headers:{Authorization:`Bearer ${key}`},next:{revalidate:3600}})
      if(res.ok){const data=await res.json();const r=data.records?.[0]?.fields;if(r?.body)return r as Content}
    } catch {}
  }
  const fb=STATIC[slug]; if(fb) return {content_id:slug,keywords:'',faq_schema:'',published_at:'',meta_title:fb.title||'',meta_description:fb.meta_description||'',...fb} as Content
  return null
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const {slug}=await params; const c=await fetchContent(slug)
  if(!c) return {title:'Guide | NexaStore'}
  return {title:c.meta_title||c.title,description:c.meta_description,keywords:c.keywords}
}
function md(text:string):string {
  return text
    .replace(/^### (.+)$/gm,'<h3 class="text-xl font-semibold text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm,'<h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-[#2A2A2A]">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong class="text-white font-semibold">$1</strong>')
    .replace(/^- (.+)$/gm,'<li class="text-[#B0B0B0] mb-2">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g,'<ul class="list-disc list-inside mb-6 pl-2">$1</ul>')
    .replace(/^(?!<[hul]).+/gm,(l)=>l.trim()?`<p class="text-[#B0B0B0] leading-relaxed mb-4">${l}</p>`:'')
}
export default async function GuidePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const c=await fetchContent(slug); if(!c) notFound()
  return (
    <>
      {c.faq_schema&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:c.faq_schema}}/>}
      <main className="min-h-screen bg-[#0D0D0D] text-white">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-[#555]">
            <Link href="/" className="hover:text-[#F5A623]">Home</Link><span>/</span>
            <Link href="/guides" className="hover:text-[#F5A623]">Guides</Link><span>/</span>
            <span className="text-[#A0A0A0] truncate">{c.title}</span>
          </div>
        </div>
        <header className="border-b border-[#2A2A2A] bg-[#111] py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block text-xs font-semibold text-[#F5A623] bg-[#F5A62315] px-3 py-1 rounded-full mb-4">{c.category}</span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{c.title}</h1>
            {c.meta_description&&<p className="text-[#A0A0A0] text-lg max-w-2xl">{c.meta_description}</p>}
            {c.word_count&&<p className="text-[#555] text-sm mt-4">{c.word_count} words · {Math.ceil(c.word_count/200)} min read</p>}
          </div>
        </header>
        <article className="max-w-4xl mx-auto px-4 py-12">
          <div dangerouslySetInnerHTML={{__html:md(c.body||'')}}/>
        </article>
        <section className="border-t border-[#2A2A2A] bg-[#111] py-10 px-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">Browse {c.category} Products</h3>
              <p className="text-[#A0A0A0] text-sm">Shop our full {c.category.toLowerCase()} range.</p>
            </div>
            <Link href={`/?category=${encodeURIComponent(c.category)}`} className="bg-[#F5A623] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#E09000] transition-colors text-sm">Shop {c.category} →</Link>
          </div>
        </section>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/guides" className="text-[#F5A623] text-sm hover:underline">← Back to all guides</Link>
        </div>
      </main>
    </>
  )
}
""")

write("app/compare/[slug]/page.tsx", """\
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
export const revalidate = 3600
interface Content { content_id:string; title:string; meta_title:string; meta_description:string; category:string; body:string; faq_schema:string; word_count:number }
async function fetchContent(slug:string):Promise<Content|null> {
  const base=process.env.AIRTABLE_BASE_ID; const key=process.env.AIRTABLE_API_KEY
  if(!base||!key) return null
  try {
    const f=encodeURIComponent(`AND({content_id}='${slug}',{status}='published',{content_tier}='comparison')`)
    const res=await fetch(`https://api.airtable.com/v0/${base}/Haya_Content?filterByFormula=${f}&maxRecords=1`,{headers:{Authorization:`Bearer ${key}`},next:{revalidate:3600}})
    if(!res.ok) return null
    const data=await res.json(); return data.records?.[0]?.fields||null
  } catch { return null }
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const {slug}=await params; const c=await fetchContent(slug)
  return c?{title:c.meta_title||c.title,description:c.meta_description}:{title:'Comparison | NexaStore'}
}
function md(text:string):string {
  return text
    .replace(/^## (.+)$/gm,'<h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-[#2A2A2A]">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong class="text-white font-semibold">$1</strong>')
    .replace(/^- (.+)$/gm,'<li class="text-[#B0B0B0] mb-2">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g,'<ul class="list-disc list-inside mb-6 pl-2">$1</ul>')
    .replace(/^(?!<[hul]).+/gm,(l)=>l.trim()?`<p class="text-[#B0B0B0] leading-relaxed mb-4">${l}</p>`:'')
}
export default async function ComparePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const c=await fetchContent(slug); if(!c) notFound()
  return (
    <>
      {c.faq_schema&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:c.faq_schema}}/>}
      <main className="min-h-screen bg-[#0D0D0D] text-white">
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-[#555]">
            <Link href="/" className="hover:text-[#F5A623]">Home</Link><span>/</span>
            <Link href="/guides" className="hover:text-[#F5A623]">Guides</Link><span>/</span>
            <span className="text-[#A0A0A0]">Compare</span>
          </div>
        </div>
        <header className="border-b border-[#2A2A2A] bg-[#111] py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block text-xs font-semibold text-[#5DADE2] bg-[#5DADE215] px-3 py-1 rounded-full mb-4">vs Comparison</span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{c.title}</h1>
            {c.meta_description&&<p className="text-[#A0A0A0] text-lg max-w-2xl">{c.meta_description}</p>}
          </div>
        </header>
        <article className="max-w-4xl mx-auto px-4 py-12">
          <div dangerouslySetInnerHTML={{__html:md(c.body||'')}}/>
        </article>
        <section className="border-t border-[#2A2A2A] bg-[#111] py-10 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <Link href="/guides" className="border border-[#2A2A2A] text-white px-5 py-2.5 rounded-lg hover:border-[#F5A623] hover:text-[#F5A623] transition-all text-sm">← More guides</Link>
            <Link href={`/?category=${encodeURIComponent(c.category)}`} className="bg-[#F5A623] text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-[#E09000] transition-colors text-sm">Shop {c.category} →</Link>
          </div>
        </section>
      </main>
    </>
  )
}
""")

print(f"\n{'='*55}")
print("  All files written successfully.")
print(f"{'='*55}")
print("""
  Files created:
  app/guides/page.tsx
  app/guides/[slug]/page.tsx
  app/compare/[slug]/page.tsx

  NEXT STEPS:
  1. Add Guides link to your Navbar
  2. npm run build
  3. git add -A && git commit -m "feat: guides pages s22" && git push
""")
