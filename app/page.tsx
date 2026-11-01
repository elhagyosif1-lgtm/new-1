'use client';

import { useMemo, useState } from 'react';

const packages = [
  { coins: 70, label: 'بداية خفيفة', popular: false },
  { coins: 350, label: 'الأكثر طلباً', popular: true },
  { coins: 700, label: 'قيمة أفضل', popular: false },
  { coins: 1400, label: 'للداعمين', popular: false },
  { coins: 3500, label: 'باقة كبيرة', popular: false },
  { coins: 7000, label: 'باقة مميزة', popular: false },
];

const steps = [
  ['01', 'اختيار الباقة', 'حدد كمية العملات المطلوبة.'],
  ['02', 'تأكيد الطلب', 'راجع بيانات المستلم قبل الإرسال.'],
  ['03', 'الدفع الموثق', 'يظهر فقط بعد تفعيل وسيلة دفع حقيقية.'],
  ['04', 'متابعة التسليم', 'تتبع حالة الطلب من حسابك.'],
];

export default function Home() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState(350);
  const [notice, setNotice] = useState('');

  const chosen = useMemo(() => packages.find((item) => item.coins === selected)!, [selected]);

  function validateDetails() {
    const clean = username.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9._]{2,24}$/.test(clean)) {
      setNotice('راجع اسم المستخدم؛ استخدم 2 إلى 24 حرفاً أو رقماً أو نقطة أو شرطة سفلية.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice('أدخل بريد إلكتروني صحيحاً للتواصل.');
      return;
    }
    setNotice('البيانات سليمة. إنشاء الطلب متوقف حالياً حتى يتم ربط تسجيل الدخول وقاعدة البيانات والدفع والمورد الفعلي.');
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="مركز العملات - الرئيسية">
          <span className="brand-mark">C</span>
          <span><strong>COIN CENTER</strong><small>مركز شحن مستقل</small></span>
        </a>
        <div className="topbar-actions">
          <span className="secure-label"><i /> بيئة آمنة قيد التجهيز</span>
          <button className="login-button" type="button" disabled>تسجيل الدخول قريباً</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><b /> شحن واضح. متابعة دقيقة.</span>
          <h1>عملاتك، بطلب<br /><em>بسيط وواضح.</em></h1>
          <p>اختر الباقة التي تناسبك، راجع بيانات المستلم، وتابع حالة طلبك خطوة بخطوة. لن نعرض عملية دفع أو تسليم قبل ربطها بخدمة حقيقية.</p>
          <div className="hero-points">
            <span><i>✓</i> تفاصيل واضحة قبل الطلب</span>
            <span><i>✓</i> سجل معاملات قابل للمراجعة</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="بطاقة توضيحية للعملات">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="coin-card">
            <div className="coin-card-top"><span>COIN CENTER</span><span>01 / 04</span></div>
            <div className="coin-symbol">C</div>
            <div className="coin-card-bottom"><span>YOUR ORDER</span><strong>بكل وضوح</strong></div>
          </div>
          <div className="float-chip chip-top">متابعة شفافة <b>↗</b></div>
          <div className="float-chip chip-bottom"><b>✓</b> لا أرصدة وهمية</div>
        </div>
      </section>

      <section className="trust-strip">
        <div><strong>01</strong><span>طلب واضح</span></div>
        <div><strong>02</strong><span>دفع موثق</span></div>
        <div><strong>03</strong><span>تسليم مؤكد</span></div>
        <p>منصة مستقلة وليست بوابة رسمية لأي تطبيق آخر.</p>
      </section>

      <section className="order-section" id="order">
        <div className="section-heading">
          <div><span className="eyebrow">ابدأ من هنا</span><h2>جهّز طلبك</h2></div>
          <span className="section-note">الأسعار والدفع غير مفعّلين بعد</span>
        </div>
        <div className="order-layout">
          <div className="package-panel">
            <h3>اختر كمية العملات</h3>
            <p className="subtext">حدد الباقة المناسبة. السعر سيظهر بعد اعتماد التسعير وربط وسيلة الدفع.</p>
            <div className="package-grid">
              {packages.map((item) => (
                <button key={item.coins} type="button" className={selected === item.coins ? 'package selected' : 'package'} onClick={() => { setSelected(item.coins); setNotice(''); }}>
                  {item.popular && <span className="popular-tag">اختيار شائع</span>}
                  <span className="package-icon">◈</span>
                  <strong>{item.coins.toLocaleString('en-US')}</strong>
                  <small>عملة</small>
                  <span className="package-label">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="form-fields">
              <label htmlFor="username">اسم حساب المستلم</label>
              <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="@username" autoComplete="off" />
              <label htmlFor="email">بريد التواصل</label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" />
            </div>
          </div>
          <aside className="summary-panel">
            <span className="summary-kicker">ملخص الاختيار</span>
            <div className="summary-amount">{chosen.coins.toLocaleString('en-US')} <small>عملة</small></div>
            <p>{chosen.label}</p>
            <div className="summary-line"><span>قيمة الباقة</span><strong>سيتم تحديدها لاحقاً</strong></div>
            <div className="summary-line"><span>وسيلة الدفع</span><strong className="pending">غير مفعّلة</strong></div>
            <div className="summary-line"><span>التسليم</span><strong className="pending">غير متاح حالياً</strong></div>
            <button className="primary-button" type="button" onClick={validateDetails}>مراجعة البيانات <span>←</span></button>
            {notice && <p className="inline-notice" role="status">{notice}</p>}
            <small className="summary-foot">لن يتم تحصيل أي مبلغ من خلال هذه الصفحة حالياً.</small>
          </aside>
        </div>
      </section>

      <section className="process-section">
        <div className="section-heading"><div><span className="eyebrow">كيف يعمل المركز</span><h2>أربع خطوات، بلا غموض</h2></div></div>
        <div className="steps-grid">{steps.map(([number, title, description]) => <article className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <footer className="footer">
        <div className="brand footer-brand"><span className="brand-mark">C</span><span><strong>COIN CENTER</strong><small>مركز شحن مستقل</small></span></div>
        <p>نحن لا نطلب كلمة مرور حسابك، ولا نعرض نجاح دفع أو تسليم غير مؤكد.</p>
        <span>© {new Date().getFullYear()} Coin Center</span>
      </footer>
    </main>
  );
}
