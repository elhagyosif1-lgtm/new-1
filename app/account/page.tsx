import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { claims }, error } = await supabase.auth.getClaims();
  if (error || !claims) redirect('/login?next=%2Faccount');
  const email = typeof claims.email === 'string' ? claims.email : 'حسابك';

  return (
    <main className="site-shell" style={{ minHeight: '100dvh', padding: 24 }}>
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">C</span><span><strong>COIN CENTER</strong><small>مركز شحن مستقل</small></span></Link>
        <form action="/auth/signout" method="post"><button className="login-button" type="submit">تسجيل الخروج</button></form>
      </header>
      <section className="summary-panel" style={{ maxWidth: 720, margin: '64px auto', padding: 32 }}>
        <span className="eyebrow">حساب محمي</span>
        <h1>مرحباً بك</h1>
        <p>{email}</p>
        <p className="subtext">تم التحقق من جلسة الدخول على الخادم. ستظهر الطلبات والمعاملات هنا بعد ربطها بقاعدة البيانات.</p>
        <Link className="primary-button" href="/" style={{ display: 'inline-flex', marginTop: 20 }}>العودة للرئيسية</Link>
      </section>
    </main>
  );
}
