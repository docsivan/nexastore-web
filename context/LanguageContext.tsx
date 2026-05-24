'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language } from '@/lib/types'

// ─── Translations ─────────────────────────────────────────────────────────────
export const translations = {
  en: {
    nav: {
      home: 'Home',
      products: 'Products',
      categories: 'Categories',
      about: 'About',
      contact: 'Contact',
      cart: 'Cart',
    },
    home: {
      hero_title: 'Professional Healthcare Supplies',
      hero_subtitle: 'Trusted partner for infection control, dental & medical consumables across the Sultanate of Oman.',
      shop_now: 'Shop Now',
      browse_categories: 'Browse Categories',
      featured: 'Featured Products',
      view_all: 'View All',
      categories_heading: 'Shop by Category',
    },
    product: {
      add_to_cart: 'Add to Cart',
      added: 'Added!',
      in_stock: 'In Stock',
      out_of_stock: 'Out of Stock',
      low_stock: 'Low Stock',
      sku: 'SKU',
      brand: 'Brand',
      origin: 'Country of Origin',
      unit_size: 'Unit Size',
      min_order: 'Min. Order',
      certifications: 'Certifications',
      description: 'Description',
      related: 'Related Products',
    },
    cart: {
      title: 'Your Cart',
      empty: 'Your cart is empty',
      empty_desc: 'Browse our products and add items to your cart',
      subtotal: 'Subtotal',
      vat: 'VAT (5%)',
      total: 'Total',
      checkout: 'Proceed to Checkout',
      continue: 'Continue Shopping',
      remove: 'Remove',
      items: 'items',
    },
    checkout: {
      title: 'Checkout',
      contact_info: 'Contact Information',
      delivery: 'Delivery Address',
      first_name: 'First Name',
      last_name: 'Last Name',
      email: 'Email Address',
      phone: 'Phone Number',
      company: 'Company Name (Optional)',
      vat_number: 'VAT Number (Optional)',
      address: 'Street Address',
      city: 'City',
      governorate: 'Governorate',
      notes: 'Order Notes (Optional)',
      pay_now: 'Pay Now',
      order_summary: 'Order Summary',
    },
    order: {
      confirmed: 'Order Confirmed!',
      confirmed_desc: 'Thank you for your order. You will receive a confirmation email shortly.',
      order_number: 'Order Number',
      whatsapp_support: 'Contact via WhatsApp',
      track_order: 'Track Order',
    },
    footer: {
      tagline: 'Your trusted partner for professional healthcare supplies in Oman.',
      quick_links: 'Quick Links',
      categories: 'Categories',
      support: 'Support',
      about: 'About Us',
      contact: 'Contact',
      privacy: 'Privacy Policy',
      terms: 'Terms & Conditions',
      rights: 'All rights reserved.',
    },
  },
  ar: {
    nav: {
      home: 'الرئيسية',
      products: 'المنتجات',
      categories: 'الفئات',
      about: 'من نحن',
      contact: 'اتصل بنا',
      cart: 'السلة',
    },
    home: {
      hero_title: 'مستلزمات الرعاية الصحية المهنية',
      hero_subtitle: 'شريكك الموثوق لمنتجات مكافحة العدوى والأسنان والمستلزمات الطبية في سلطنة عُمان.',
      shop_now: 'تسوق الآن',
      browse_categories: 'تصفح الفئات',
      featured: 'المنتجات المميزة',
      view_all: 'عرض الكل',
      categories_heading: 'تسوق حسب الفئة',
    },
    product: {
      add_to_cart: 'أضف إلى السلة',
      added: 'تمت الإضافة!',
      in_stock: 'متوفر',
      out_of_stock: 'غير متوفر',
      low_stock: 'مخزون محدود',
      sku: 'رمز المنتج',
      brand: 'الماركة',
      origin: 'بلد المنشأ',
      unit_size: 'حجم الوحدة',
      min_order: 'الحد الأدنى للطلب',
      certifications: 'الشهادات',
      description: 'الوصف',
      related: 'منتجات ذات صلة',
    },
    cart: {
      title: 'سلة التسوق',
      empty: 'سلتك فارغة',
      empty_desc: 'تصفح منتجاتنا وأضف عناصر إلى سلتك',
      subtotal: 'المجموع الفرعي',
      vat: 'ضريبة القيمة المضافة (5%)',
      total: 'الإجمالي',
      checkout: 'إتمام الشراء',
      continue: 'مواصلة التسوق',
      remove: 'إزالة',
      items: 'عناصر',
    },
    checkout: {
      title: 'إتمام الشراء',
      contact_info: 'معلومات الاتصال',
      delivery: 'عنوان التوصيل',
      first_name: 'الاسم الأول',
      last_name: 'اسم العائلة',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      company: 'اسم الشركة (اختياري)',
      vat_number: 'رقم ضريبة القيمة المضافة (اختياري)',
      address: 'عنوان الشارع',
      city: 'المدينة',
      governorate: 'المحافظة',
      notes: 'ملاحظات الطلب (اختياري)',
      pay_now: 'ادفع الآن',
      order_summary: 'ملخص الطلب',
    },
    order: {
      confirmed: 'تم تأكيد الطلب!',
      confirmed_desc: 'شكراً لطلبك. ستتلقى بريداً إلكترونياً للتأكيد قريباً.',
      order_number: 'رقم الطلب',
      whatsapp_support: 'تواصل عبر واتساب',
      track_order: 'تتبع الطلب',
    },
    footer: {
      tagline: 'شريكك الموثوق للمستلزمات الصحية المهنية في عُمان.',
      quick_links: 'روابط سريعة',
      categories: 'الفئات',
      support: 'الدعم',
      about: 'من نحن',
      contact: 'اتصل بنا',
      privacy: 'سياسة الخصوصية',
      terms: 'الشروط والأحكام',
      rights: 'جميع الحقوق محفوظة.',
    },
  },
} as const

type TranslationKey = typeof translations.en

// ─── Context ─────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: TranslationKey
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('hayat_lang') as Language | null
    if (saved === 'ar' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = (l: Language) => {
    setLangState(l)
    localStorage.setItem('hayat_lang', l)
    document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', l)
  }

  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t: translations[lang] as TranslationKey,
        isRTL: lang === 'ar',
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguageContext(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguageContext must be used inside LanguageProvider')
  return ctx
}
