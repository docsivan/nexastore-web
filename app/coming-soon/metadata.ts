import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hayat Supplies — Healthcare Procurement Platform | Oman | Coming Soon",
  description: "Hayat Supplies is Oman's first AI-powered healthcare procurement platform. Medical, dental, infection control, PPE and sterilization supplies — ISO 13485 certified, MOH Oman compliant, delivered in Muscat. Register for early access.",
  keywords: "healthcare supplies oman, medical supplies muscat, dental supplies oman, infection control oman, PPE supplier oman, MOH oman compliant supplies, ISO 13485 medical supplier oman, مستلزمات طبية عمان, مستلزمات أسنان مسقط, مكافحة العدوى عمان",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://hayatsupplies.com",
    languages: { "en-OM": "https://hayatsupplies.com", "ar-OM": "https://hayatsupplies.com?lang=ar" },
  },
  openGraph: {
    type: "website",
    url: "https://hayatsupplies.com",
    siteName: "Hayat Supplies",
    title: "Hayat Supplies — Oman's Healthcare Procurement Platform",
    description: "AI-powered medical, dental, infection control and PPE procurement for clinics, hospitals and healthcare facilities across the Sultanate of Oman.",
    images: [{ url: "https://hayatsupplies.com/og-image.jpg", width: 1200, height: 630, alt: "Hayat Supplies — Healthcare Procurement Platform, Oman" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hayat Supplies — Oman's Healthcare Procurement Platform",
    description: "AI-powered healthcare procurement for clinics and hospitals across Oman.",
    images: ["https://hayatsupplies.com/og-image.jpg"],
  },
  other: {
    "geo.region": "OM-MA",
    "geo.placename": "Muscat, Sultanate of Oman",
    "geo.position": "23.5880;58.3829",
    "ICBM": "23.5880, 58.3829",
  },
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["MedicalBusiness", "Store"],
  name: "Hayat Supplies",
  alternateName: "حياة سبلايز",
  url: "https://hayatsupplies.com",
  description: "Oman's first AI-powered healthcare procurement platform serving clinics, hospitals and dental practices with medical, dental, infection control, PPE and sterilization supplies.",
  address: { "@type": "PostalAddress", addressCountry: "OM", addressRegion: "Muscat" },
  areaServed: [{ "@type": "Country", name: "Oman" }, { "@type": "City", name: "Muscat" }],
  medicalSpecialty: ["Dentistry", "InfectionControl", "GeneralPractice"],
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "What is Hayat Supplies?", acceptedAnswer: { "@type": "Answer", text: "Hayat Supplies is Oman's first AI-powered healthcare procurement platform, serving clinics, hospitals and dental practices with medical, dental, infection control, PPE and sterilization supplies — ISO 13485 certified and MOH Oman compliant." } },
    { "@type": "Question", name: "Where does Hayat Supplies deliver in Oman?", acceptedAnswer: { "@type": "Answer", text: "Hayat Supplies offers same-day delivery within Muscat Governorate, with expansion across all governorates of the Sultanate planned shortly after launch." } },
    { "@type": "Question", name: "Is Hayat Supplies MOH Oman compliant?", acceptedAnswer: { "@type": "Answer", text: "Yes. All products comply with Ministry of Health Oman regulations and carry CE, ASTM, ISO 13485:2016, and EN certifications where applicable." } },
    { "@type": "Question", name: "ما هي حياة سبلايز؟", acceptedAnswer: { "@type": "Answer", text: "حياة سبلايز هي أول منصة رقمية مدعومة بالذكاء الاصطناعي لشراء المستلزمات الصحية في سلطنة عُمان، معتمدة بمعيار ISO 13485 ومتوافقة مع وزارة الصحة." } },
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: "https://hayatsupplies.com",
  name: "Hayat Supplies",
  inLanguage: ["en-OM", "ar-OM"],
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: "https://hayatsupplies.com/products?q={search_term_string}" },
    "query-input": "required name=search_term_string",
  },
};
