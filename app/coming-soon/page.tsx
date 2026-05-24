"use client";

import { useState } from "react";

const STORY = {
  en: {
    eyebrow: "Why we exist",
    headline: "Healthcare in Oman deserves a better way to procure.",
    body: [
      "Every clinic manager, procurement officer, and dental practitioner in Oman knows the frustration — hours on the phone chasing stock, waiting days for a supplier to respond, never quite sure if the product meets the standard your facility requires.",
      "We built NexaStore to solve exactly that. A single platform where every medical, dental, infection control, PPE, and sterilization supply you need is certified, in stock, and delivered the same day in Muscat.",
      "Nexa — life — because what we supply supports the work that saves it. We are building this for the healthcare community of Oman, and we are almost ready.",
    ],
    signature: "The NexaStore Team",
    signatureRole: "Sultanate of Oman · Infection Control · Dental · MOH Compliant",
  },
  ar: {
    eyebrow: "لماذا وُجدنا",
    headline: "قطاع الرعاية الصحية في عُمان يستحق طريقة أفضل للتوريد.",
    body: [
      "كل مدير عيادة ومسؤول مشتريات وطبيب أسنان في عُمان يعرف الإحباط جيدًا — ساعات على الهاتف تبحث عن المخزون، أيام في انتظار رد الموردين، وعدم اليقين دائمًا من مطابقة المنتج للمعايير التي تتطلبها منشأتك.",
      "بنينا حياة سبلايز لحل هذه المشكلة تحديدًا. منصة واحدة تجد فيها كل ما تحتاجه من مستلزمات طبية وأسنان ومكافحة عدوى ومعدات وقاية وتعقيم — معتمدة، متوفرة، وتُسلَّم في نفس اليوم في مسقط.",
      "حياة — لأن ما نوفّره يدعم العمل الذي يُنقذها. نبني هذه المنصة من أجل مجتمع الرعاية الصحية في عُمان، ونحن على وشك الانتهاء.",
    ],
    signature: "فريق حياة سبلايز",
    signatureRole: "سلطنة عُمان · مكافحة العدوى · طب الأسنان · متوافق مع وزارة الصحة",
  },
};

const TRUST = {
  en: ["ISO 13485:2016 Certified","MOH Oman Compliant","50+ Product Categories","AI-Powered Procurement","Same-Day Muscat Delivery","CE & ASTM Standards"],
  ar: ["معتمد ISO 13485:2016","متوافق مع وزارة الصحة عُمان","٥٠+ فئة منتج","مشتريات مدعومة بالذكاء الاصطناعي","توصيل في نفس اليوم بمسقط","معايير CE و ASTM"],
};

const FAQ = {
  en: [
    { q: "What is NexaStore?", a: "NexaStore is Oman's first AI-powered healthcare procurement platform, serving clinics, hospitals, dental practices and healthcare facilities across the Sultanate with medical, dental, infection control, PPE, sterilization and diagnostic supplies — all ISO 13485 certified and MOH Oman compliant." },
    { q: "Who is NexaStore built for?", a: "Built for procurement officers, clinic managers, dentists, doctors, and healthcare facility operators across Oman who need a reliable, fast, and MOH-compliant supply channel." },
    { q: "When does NexaStore launch?", a: "We are in final development. Register your details to receive exclusive early access before the public launch." },
    { q: "What products will NexaStore carry?", a: "Infection control products, dental supplies, PPE, sterilization equipment, diagnostics, and medical devices — all sourced from globally certified manufacturers and compliant with MOH Oman, CE, ASTM, and ISO standards." },
    { q: "Is NexaStore available outside Muscat?", a: "Our primary launch covers Muscat Governorate with same-day delivery. Expansion across all governorates of the Sultanate follows shortly after launch." },
    { q: "How do I get early access?", a: "Enter your email and phone number on this page. Early registrants receive priority onboarding, first-order benefits, and personal notification before the public launch." },
  ],
  ar: [
    { q: "ما هي حياة سبلايز؟", a: "حياة سبلايز هي أول منصة رقمية مدعومة بالذكاء الاصطناعي لشراء المستلزمات الصحية في سلطنة عُمان، تخدم العيادات والمستشفيات وعيادات طب الأسنان بمنتجات طبية وأسنان ومكافحة عدوى ومعدات وقاية وتعقيم — جميعها معتمدة بمعيار ISO 13485 ومتوافقة مع وزارة الصحة." },
    { q: "لمن صُممت هذه المنصة؟", a: "صُممت لمسؤولي المشتريات ومديري العيادات والأطباء وأطباء الأسنان والقائمين على المرافق الصحية في سلطنة عُمان الذين يحتاجون إلى قناة توريد موثوقة وسريعة ومتوافقة مع وزارة الصحة." },
    { q: "متى يكون الإطلاق الرسمي؟", a: "نحن في المراحل الأخيرة من التطوير. سجّل بياناتك للحصول على وصول مبكر حصري قبل الإطلاق العام." },
    { q: "ما المنتجات التي ستتوفر في المنصة؟", a: "مستلزمات مكافحة العدوى، ومستلزمات طب الأسنان، ومعدات الوقاية الشخصية، وأجهزة التعقيم، والتشخيص، والأجهزة الطبية — جميعها من موردين معتمدين دوليًا ومتوافقة مع معايير وزارة الصحة." },
    { q: "هل الخدمة متاحة خارج مسقط؟", a: "الإطلاق الأول يغطي محافظة مسقط مع التوصيل في نفس اليوم. يعقبه التوسع لتغطية كامل السلطنة." },
    { q: "كيف أحصل على وصول مبكر؟", a: "أدخل بريدك الإلكتروني ورقم هاتفك في هذه الصفحة. سيحصل المسجّلون مبكرًا على أولوية الإعداد ومزايا الطلب الأول وإشعار شخصي قبل الإطلاق العام." },
  ],
};

export default function ComingSoon() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isAr = lang === "ar";
  const story = STORY[lang];
  const trust = TRUST[lang];
  const faqs = FAQ[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(isAr ? "يرجى إدخال بريد إلكتروني صحيح." : "Please enter a valid email address.");
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 8) {
      setError(isAr ? "يرجى إدخال رقم هاتف صحيح." : "Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, phone: trimmedPhone, lang }),
      });
      if (res.ok) {
        setSubmitted(true);
        setError("");
      } else {
        setError(isAr ? "حدث خطأ. يرجى المحاولة مجددًا." : "Something went wrong. Please try again.");
      }
    } catch {
      setError(isAr ? "حدث خطأ. يرجى المحاولة مجددًا." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0a1628; }
        .page { background: #0a1628; color: #fff; font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }
        .ar { direction: rtl; }
        .ar p, .ar h1, .ar h2, .ar button, .ar label, .ar input { font-family: 'Noto Sans Arabic', serif; }

        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; background: rgba(10,22,40,0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-icon { width: 34px; height: 34px; background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .logo-name { font-family: 'Playfair Display', Georgia, serif; font-size: 19px; font-weight: 700; color: #fff; }
        .logo-name span { color: #F5A623; }
        .lang-toggle { display: flex; gap: 4px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 4px; }
        .lang-btn { padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; letter-spacing: 0.5px; }
        .lang-btn.active { background: #F5A623; color: #fff; }
        .lang-btn:not(.active) { background: transparent; color: rgba(255,255,255,0.4); }
        .lang-btn:not(.active):hover { color: rgba(255,255,255,0.7); }

        .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 120px 24px 80px; text-align: center; }
        .hero-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(76,175,80,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(76,175,80,0.04) 1px, transparent 1px); background-size: 52px 52px; pointer-events: none; }
        .hero-radial { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(13,13,13,0.4) 0%, transparent 70%); pointer-events: none; }
        .cross { position: absolute; pointer-events: none; opacity: 0.07; }
        .cross::before, .cross::after { content: ''; position: absolute; background: #F5A623; }
        .cross::before { width: 2px; height: 24px; top: 0; left: 11px; }
        .cross::after { width: 24px; height: 2px; top: 11px; left: 0; }
        .hero-content { position: relative; z-index: 2; max-width: 720px; }
        .eyebrow { font-size: 11px; letter-spacing: 5px; text-transform: uppercase; color: #F5A623; font-weight: 500; margin-bottom: 24px; }
        .ar .eyebrow { letter-spacing: 2px; }
        .hero-headline { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(38px, 6vw, 68px); font-weight: 600; line-height: 1.12; color: #fff; margin-bottom: 24px; }
        .ar .hero-headline { font-family: 'Noto Sans Arabic', serif; font-size: clamp(34px, 5.5vw, 58px); line-height: 1.4; font-weight: 600; }
        .hero-headline em { font-style: italic; color: #F5A623; }
        .hero-sub { font-size: 16px; color: rgba(255,255,255,0.70); line-height: 1.8; max-width: 500px; margin: 0 auto 48px; font-weight: 300; }

        .form-wrap { width: 100%; max-width: 500px; margin: 0 auto; }
        .form-fields { display: flex; flex-direction: column; gap: 10px; }
        .form-row { display: flex; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 4px 4px 4px 16px; transition: border-color 0.2s; }
        .ar .form-row { padding: 4px 16px 4px 4px; }
        .form-row:focus-within { border-color: rgba(76,175,80,0.4); }
        .form-row input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; padding: 10px 0; min-width: 0; }
        .ar .form-row input { font-family: 'Noto Sans Arabic', serif; }
        .form-row input::placeholder { color: rgba(255,255,255,0.50); }
        .form-icon { color: rgba(255,255,255,0.2); font-size: 15px; margin-right: 10px; flex-shrink: 0; }
        .ar .form-icon { margin-right: 0; margin-left: 10px; }
        .form-submit { width: 100%; background: #F5A623; color: #fff; border: none; border-radius: 12px; padding: 14px; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; letter-spacing: 0.3px; transition: background 0.2s, transform 0.1s; margin-top: 4px; }
        .ar .form-submit { font-family: 'Noto Sans Arabic', serif; }
        .form-submit:hover { background: #43a047; }
        .form-submit:active { transform: scale(0.98); }
        .form-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-note { font-size: 11px; color: rgba(255,255,255,0.2); text-align: center; margin-top: 12px; line-height: 1.6; }
        .form-error { color: #ff8a80; font-size: 12px; margin-top: 10px; text-align: center; }
        .success-box { padding: 24px 28px; background: rgba(76,175,80,0.08); border: 1px solid rgba(76,175,80,0.2); border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .success-check { width: 48px; height: 48px; background: rgba(76,175,80,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #F5A623; font-size: 22px; }
        .success-title { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; color: #fff; }
        .ar .success-title { font-family: 'Noto Sans Arabic', serif; }
        .success-sub { font-size: 13px; color: rgba(255,255,255,0.62); text-align: center; line-height: 1.65; max-width: 320px; }

        .trust-strip { border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 18px 0; overflow: hidden; white-space: nowrap; }
        .trust-track { display: inline-flex; gap: 40px; animation: scroll 24s linear infinite; }
        .trust-item { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.55); letter-spacing: 0.5px; white-space: nowrap; }
        .trust-dot { color: #F5A623; font-size: 7px; }
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

        .section { max-width: 720px; margin: 0 auto; padding: 96px 24px; }
        .section-label { font-size: 10px; letter-spacing: 5px; text-transform: uppercase; color: #F5A623; font-weight: 500; margin-bottom: 20px; }
        .ar .section-label { letter-spacing: 1px; }
        .story-headline { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(26px, 4vw, 40px); font-weight: 600; color: #fff; line-height: 1.28; margin-bottom: 36px; }
        .ar .story-headline { font-family: 'Noto Sans Arabic', serif; }
        .story-body p { font-size: 15px; color: rgba(255,255,255,0.72); line-height: 1.9; font-weight: 300; margin-bottom: 22px; }
        .story-body p:last-child { margin-bottom: 0; }
        .story-sig { margin-top: 36px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.07); }
        .story-sig-name { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.7); font-style: italic; }
        .ar .story-sig-name { font-family: 'Noto Sans Arabic', serif; font-style: normal; }
        .story-sig-role { font-size: 11px; color: rgba(255,255,255,0.50); letter-spacing: 0.5px; margin-top: 5px; }

        .divider { height: 1px; background: rgba(255,255,255,0.05); max-width: 720px; margin: 0 auto; }

        .faq-section { max-width: 720px; margin: 0 auto; padding: 80px 24px 96px; }
        .faq-headline { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(24px, 3.5vw, 36px); font-weight: 600; color: #fff; margin-bottom: 40px; }
        .ar .faq-headline { font-family: 'Noto Sans Arabic', serif; }
        .faq-item { border-top: 1px solid rgba(255,255,255,0.07); }
        .faq-item:last-child { border-bottom: 1px solid rgba(255,255,255,0.07); }
        .faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 20px 0; cursor: pointer; background: transparent; border: none; color: rgba(255,255,255,0.85); font-family: 'Inter', system-ui, sans-serif; font-size: 15px; font-weight: 400; gap: 16px; }
        .ar .faq-q { font-family: 'Noto Sans Arabic', serif; text-align: right; }
        .faq-icon { color: #F5A623; font-size: 20px; flex-shrink: 0; transition: transform 0.2s; line-height: 1; }
        .faq-icon.open { transform: rotate(45deg); }
        .faq-a { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.85; padding-bottom: 20px; font-weight: 300; }
        .ar .faq-a { font-family: 'Noto Sans Arabic', serif; font-size: 15px; line-height: 2.0; }

        .footer { border-top: 1px solid rgba(255,255,255,0.05); padding: 28px 40px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .footer-left { font-size: 12px; color: rgba(255,255,255,0.45); }
        .footer-right { display: flex; gap: 24px; }
        .footer-link { font-size: 12px; color: rgba(255,255,255,0.45); text-decoration: none; }
        .footer-link:hover { color: rgba(255,255,255,0.5); }

        @media (max-width: 600px) {
          .nav { padding: 16px 20px; }
          .footer { padding: 24px 20px; flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className={`page${isAr ? " ar" : ""}`}>

        <nav className="nav">
          <div className="logo">
            <div className="logo-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="#F5A623" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="logo-name">Nexa <span>Supplies</span></span>
          </div>
          <div className="lang-toggle">
            <button className={`lang-btn${!isAr ? " active" : ""}`} onClick={() => setLang("en")}>EN</button>
            <button className={`lang-btn${isAr ? " active" : ""}`} onClick={() => setLang("ar")}>عربي</button>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-radial" />
          <div className="cross" style={{left:"7%",top:"20%"}} />
          <div className="cross" style={{left:"88%",top:"15%"}} />
          <div className="cross" style={{left:"4%",top:"70%"}} />
          <div className="cross" style={{left:"91%",top:"68%"}} />
          <div className="cross" style={{left:"48%",top:"87%"}} />

          <div className="hero-content">
            <p className="eyebrow">
              {isAr ? "سلطنة عُمان · منصة المستلزمات الصحية" : "Sultanate of Oman · Healthcare Procurement Platform"}
            </p>
            <h1 className="hero-headline">
              {isAr
                ? <>كل مستلزم صحي تحتاجه<br/><em>في مكان واحد</em></>
                : <>Every healthcare supply<br/>your facility needs —<br/><em>one platform</em></>
              }
            </h1>
            <p className="hero-sub">
              {isAr
                ? "نبني أول منصة رقمية ذكية لشراء المستلزمات الطبية والأسنان ومكافحة العدوى في سلطنة عُمان. سجّل اهتمامك وكن أول من يصل."
                : "We are building Oman's first AI-powered procurement platform for clinics, hospitals and dental practices. Certified, compliant, and delivered."
              }
            </p>

            <div className="form-wrap">
              {!submitted ? (
                <form onSubmit={handleSubmit}>
                  <div className="form-fields">
                    <div className="form-row">
                      <span className="form-icon">✉</span>
                      <input
                        type="email"
                        placeholder={isAr ? "البريد الإلكتروني" : "Email address"}
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(""); }}
                        dir="ltr"
                      />
                    </div>
                    <div className="form-row">
                      
                      <input
                        type="tel"
                        placeholder={isAr ? "رقم الهاتف (مثال: 96812345678+)" : "Phone number (e.g. +968 9123 4567)"}
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setError(""); }}
                        dir="ltr"
                      />
                    </div>
                    <button className="form-submit" type="submit" disabled={loading}>
                      {loading
                        ? (isAr ? "جارٍ التسجيل..." : "Registering...")
                        : (isAr ? "سجّل للوصول المبكر" : "Get Early Access →")
                      }
                    </button>
                  </div>
                  {error && <p className="form-error">{error}</p>}
                  <p className="form-note">
                    {isAr
                      ? "نحترم خصوصيتك. لن نشارك بياناتك مع أي طرف ثالث."
                      : "Your details are private. We will never share them with third parties."
                    }
                  </p>
                </form>
              ) : (
                <div className="success-box">
                  <div className="success-check">✓</div>
                  <div className="success-title">
                    {isAr ? "أنت على القائمة" : "You're on the list"}
                  </div>
                  <p className="success-sub">
                    {isAr
                      ? "سنتواصل معك قبل الإطلاق بوصول مبكر حصري ومزايا الطلب الأول."
                      : "We will be in touch before launch with exclusive early access and first-order benefits."
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="trust-strip" aria-hidden="true">
          <div className="trust-track">
            {[...trust, ...trust].map((t, i) => (
              <span key={i} className="trust-item">
                <span className="trust-dot">✦</span>{t}
              </span>
            ))}
          </div>
        </div>

        <section className="section">
          <p className="section-label">{story.eyebrow}</p>
          <h2 className="story-headline">{story.headline}</h2>
          <div className="story-body">
            {story.body.map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <div className="story-sig">
            <div className="story-sig-name">{story.signature}</div>
            <div className="story-sig-role">{story.signatureRole}</div>
          </div>
        </section>

        <div className="divider" />

        <section className="faq-section">
          <h2 className="faq-headline">
            {isAr ? "الأسئلة الشائعة" : "Frequently asked questions"}
          </h2>
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <button
                className="faq-q"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                style={{ textAlign: isAr ? "right" : "left" }}
              >
                {isAr
                  ? <><span className={`faq-icon${openFaq===i?" open":""}`}>+</span>{faq.q}</>
                  : <>{faq.q}<span className={`faq-icon${openFaq===i?" open":""}`}>+</span></>
                }
              </button>
              {openFaq === i && <p className="faq-a">{faq.a}</p>}
            </div>
          ))}
        </section>

        <footer className="footer">
          <div className="footer-left">
            {isAr ? "© 2025 حياة سبلايز · سلطنة عُمان" : "© 2025 NexaStore · Sultanate of Oman"}
          </div>
          <div className="footer-right">
            <a href="mailto:hello@nexastore.io" className="footer-link">hello@nexastore.io</a>
            <a href="/privacy" className="footer-link">{isAr ? "الخصوصية" : "Privacy"}</a>
          </div>
        </footer>

      </div>
    </>
  );
}
