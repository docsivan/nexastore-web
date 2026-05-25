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
