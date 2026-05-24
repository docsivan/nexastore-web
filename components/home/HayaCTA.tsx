'use client'

export default function NexaCTA() {
  const openHaya = () => {
    window.dispatchEvent(new CustomEvent('haya:open', { detail: { preloadMessage: '' } }))
  }

  return (
    <section className="w-full py-16 px-4 relative overflow-hidden bg-primary">
      {/* Fine orthogonal rule pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Accent top stripe */}
      <div className="absolute top-0 left-0 right-0 h-px bg-accent opacity-60" />

      <div className="max-w-4xl mx-auto relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          {/* Left — text */}
          <div className="max-w-lg">
            <p className="overline-label text-accent-light mb-3">AI Procurement Advisor</p>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-4 leading-tight">
              Ask Haya to Build<br className="hidden sm:block" /> Your Monthly Order
            </h2>
            <div className="w-8 h-px bg-accent mb-4" />
            <p className="font-body text-white/65 text-sm leading-relaxed">
              Tell Haya what procedures your clinic performs — she will suggest
              exactly what you need, quantities included.
            </p>
          </div>

          {/* Right — CTA */}
          <div className="flex flex-col items-start md:items-end gap-4 flex-shrink-0">
            <button
              onClick={openHaya}
              className="inline-flex items-center gap-2.5 px-7 py-3 rounded-[3px] text-sm font-semibold font-heading transition-all bg-white text-primary hover:bg-white/90 active:scale-95 shadow-modal"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Chat with Haya
            </button>
            <p className="font-body text-[11px] text-white/40 tracking-wide">
              Powered by Claude AI — clinical context aware
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
