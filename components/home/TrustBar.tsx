'use client'

const TRUST_ITEMS = [
  {
    text: 'Commerce. Powered by Intelligence.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-white">
        <path d="M10 2L3 5v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V5l-7-3z" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <path d="M7 10l2.5 2.5L14 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    text: 'Fast Global Delivery',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-white">
        <path d="M10 3v7l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
      </svg>
    ),
  },
  {
    text: '500+ Products',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-white">
        <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
      </svg>
    ),
  },
  {
    text: 'Nexa AI Search',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-white">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <path d="M8 10h4M10 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function TrustBar() {
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''
  const waMessage = encodeURIComponent('Hello NexaStore, I need help with my order.')

  return (
    <div className="w-full bg-[#0D0D0D]">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {TRUST_ITEMS.map((item, i) => (
              <div key={item.text} className="flex items-center">
                {i > 0 && <div className="w-px h-5 bg-white/20 mx-4" />}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-white text-[11px] font-medium font-body whitespace-nowrap">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
          <a
            href={`https://wa.me/${waNumber}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white text-[11px] font-semibold font-body whitespace-nowrap flex-shrink-0 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat with Us
          </a>
        </div>

        {/* Mobile marquee */}
        <div className="sm:hidden overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) => (
              <div key={i} className="flex items-center gap-2 mr-8 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-white text-[11px] font-medium font-body">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
