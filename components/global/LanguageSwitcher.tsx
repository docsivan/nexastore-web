'use client'

import { useLanguageContext } from '@/context/LanguageContext'
import { Language } from '@/lib/types'

const LANG_LABELS: Record<string, string> = {
  ar: 'عربي',
  fr: 'FR',
  hi: 'हिंदी',
  ur: 'اردو',
}

export default function LanguageSwitcher() {
  const { lang, setLang, secondLang } = useLanguageContext()

  if (!secondLang || secondLang === 'none') return null

  const label = LANG_LABELS[secondLang] ?? secondLang.toUpperCase()

  return (
    <div className="flex items-center gap-1 text-xs font-body">
      <button
        onClick={() => setLang('en')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang === 'en' ? 'text-white font-semibold' : 'text-primary-50/60 hover:text-white'
        }`}
      >
        EN
      </button>
      <span className="text-primary-50/30">|</span>
      <button
        onClick={() => setLang(secondLang as Language)}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang !== 'en' ? 'text-white font-semibold' : 'text-primary-50/60 hover:text-white'
        }`}
      >
        {label}
      </button>
    </div>
  )
}
