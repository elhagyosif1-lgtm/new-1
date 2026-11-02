'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next')?.startsWith('/') && !search.get('next')?.startsWith('//') ? search.get('next')! : '/account';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const supabase = createClient();
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://coin-center-pro.vercel.app').replace(/\\/$/, '')}/auth/callback?next=${encodeURIComponent(next)}` },
        });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === 'signup' && !result.data.session) {
      setMessage('تم إنشاء الحساب. افتح رسالة البريد الإلكتروني لتأكيد الحساب، ثم سجّل الدخول.');
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="site-shell" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="summary-panel" style={{ width: 'min(100%, 440px)', padding: 32 }}>
        <Link href="/" className="brand"><span className="brand-mark">C</span><span><strong>COIN CENTER</strong><small>مركز شحن مستقل</small></span></Link>
        <h1 style={{ marginTop: 32 }}>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1>
        <p className="subtext">استخدم بريدك الإلكتروني وكلمة المرور للوصول إلى حسابك.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <label htmlFor="auth-email">البريد الإلكتروني</label>
          <input id="auth-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          <label htmlFor="auth-password">كلمة المرور</label>
          <input id="auth-password" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} />
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'جارٍ التنفيذ…' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</button>
        </form>
        {message && <p className="inline-notice" role="status">{message}</p>}
        <button type="button" className="login-button" style={{ marginTop: 18 }} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>
          {mode === 'login' ? 'إنشاء حساب جديد' : 'لديك حساب؟ تسجيل الدخول'}
        </button>
      </section>
    </main>
  );
}


export default function LoginPage() {
  return <Suspense fallback={<main className="site-shell" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>جارٍ التحميل…</main>}><LoginForm /></Suspense>;
}
