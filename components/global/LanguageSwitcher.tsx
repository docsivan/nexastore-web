'use client'

import { useLanguageContext } from '@/context/LanguageContext'

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguageContext()

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
        onClick={() => setLang('ar')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang === 'ar' ? 'text-white font-semibold' : 'text-primary-50/60 hover:text-white'
        }`}
      >
        عربي
      </button>
    </div>
  )
}
