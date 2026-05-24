import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NexaStore — Healthcare Procurement Platform | Oman | Coming Soon",
  description: "NexaStore is Oman's first AI-powered healthcare procurement platform. Medical, dental, infection control, PPE and sterilization supplies — ISO 13485 certified, MOH Oman compliant, delivered in Muscat. Register for early access.",
  keywords: "healthcare supplies oman, medical supplies muscat, dental supplies oman, infection control oman, PPE supplier oman, MOH oman compliant supplies, ISO 13485 medical supplier oman, مستلزمات طبية عمان, مستلزمات أسنان مسقط, مكافحة العدوى عمان",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://nexastore.io",
    languages: { "en-OM": "https://nexastore.io", "ar-OM": "https://nexastore.io?lang=ar" },
  },
  openGraph: {
    type: "website",
    url: "https://nexastore.io",
    siteName: "NexaStore",
    title: "NexaStore — Oman's Healthcare Procurement Platform",
    description: "AI-powered medical, dental, infection control and PPE procurement for clinics, hospitals and healthcare facilities across the ",
    images: [{ url: "https://nexastore.io/og-image.jpg", width: 1200, height: 630, alt: "NexaStore — Healthcare Procurement Platform, Oman" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexaStore — Oman's Healthcare Procurement Platform",
    description: "AI-powered healthcare procurement for clinics and hospitals worldwide.",
    images: ["https://nexastore.io/og-image.jpg"],
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
  name: "NexaStore",
  alternateName: "حياة سبلايز",
  url: "https://nexastore.io",
  description: "Oman's first AI-powered healthcare procurement platform serving clinics, hospitals and dental practices with medical, dental, infection control, PPE and sterilization supplies.",
  address: { "@type": "PostalAddress", addressCountry: "OM", addressRegion: "Muscat" },
  areaServed: [{ "@type": "Country", name: "Oman" }, { "@type": "City", name: "Muscat" }],
  medicalSpecialty: ["Dentistry", "InfectionControl", "GeneralPractice"],
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "What is NexaStore?", acceptedAnswer: { "@type": "Answer", text: "NexaStore is Oman's first AI-powered healthcare procurement platform, serving clinics, hospitals and dental practices with medical, dental, infection control, PPE and sterilization supplies — ISO 13485 certified and MOH Oman compliant." } },
    { "@type": "Question", name: "Where does NexaStore deliver in Oman?", acceptedAnswer: { "@type": "Answer", text: "NexaStore offers same-day delivery within Muscat Governorate, with expansion across all governorates of the Sultanate planned shortly after launch." } },
    { "@type": "Question", name: "Is NexaStore MOH Oman compliant?", acceptedAnswer: { "@type": "Answer", text: "Yes. All products comply with Ministry of Health Oman regulations and carry CE, ASTM, ISO 13485:2016, and EN certifications where applicable." } },
    { "@type": "Question", name: "ما هي حياة سبلايز؟", acceptedAnswer: { "@type": "Answer", text: "حياة سبلايز هي أول منصة رقمية مدعومة بالذكاء الاصطناعي لشراء المستلزمات الصحية في سلطنة عُمان، معتمدة بمعيار ISO 13485 ومتوافقة مع وزارة الصحة." } },
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: "https://nexastore.io",
  name: "NexaStore",
  inLanguage: ["en-OM", "ar-OM"],
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: "https://nexastore.io/products?q={search_term_string}" },
    "query-input": "required name=search_term_string",
  },
};
