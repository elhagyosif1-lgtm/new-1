import React, { useState, useEffect } from 'react';
import { 
  Coins, ShieldCheck, Zap, RefreshCw, CheckCircle2, AlertCircle, 
  ExternalLink, Database, Server, Smartphone, CreditCard, 
  Wallet, ArrowRight, Lock, Check, Copy, Settings, HelpCircle,
  FileText, Upload, Globe, Terminal, Sparkles, User, LogOut, Send, CheckSquare
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface CoinPackage {
  id: string;
  coins: number;
  bonus: number;
  price_usd: number;
  price_egp: number;
  popular?: boolean;
  bestValue?: boolean;
}

const COIN_PACKAGES: CoinPackage[] = [
  { id: 'p_30', coins: 30, bonus: 0, price_usd: 0.49, price_egp: 25 },
  { id: 'p_70', coins: 70, bonus: 2, price_usd: 0.99, price_egp: 50 },
  { id: 'p_350', coins: 350, bonus: 25, price_usd: 4.99, price_egp: 240 },
  { id: 'p_700', coins: 700, bonus: 70, price_usd: 9.99, price_egp: 480 },
  { id: 'p_1400', coins: 1400, bonus: 150, price_usd: 19.99, price_egp: 960, popular: true },
  { id: 'p_3500', coins: 3500, bonus: 400, price_usd: 49.99, price_egp: 2400 },
  { id: 'p_7000', coins: 7000, bonus: 900, price_usd: 99.99, price_egp: 4800, bestValue: true },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'wallet' | 'supabase' | 'transactions' | 'supplier'>('store');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  // Supabase Configuration
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('sb_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || localStorage.getItem('sb_key') || '');
  const [client, setClient] = useState<any>(null);

  // Auth state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // App data state
  const [balance, setBalance] = useState({ coins: 0, bonus_coins: 0, total_spent: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Supplier & Order dispatch state
  const [supplierApiUrl, setSupplierApiUrl] = useState('');
  const [supplierApiKey, setSupplierApiKey] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<any>(null);

  // Checkout modal
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'vodafone_cash' | 'instapay' | 'credit_card' | 'binance'>('vodafone_cash');
  const [receiptRef, setReceiptRef] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Initialize Supabase client whenever URL/Key change
  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      try {
        const sb = createClient(supabaseUrl, supabaseKey);
        setClient(sb);
        // check session
        sb.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUser(session.user);
            fetchUserData(sb, session.user.id);
            fetchTransactions(sb, session.user.id);
          }
        });

        const { data: { subscription } } = sb.auth.onAuthStateChange((_event: any, session: any) => {
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchUserData(sb, session.user.id);
            fetchTransactions(sb, session.user.id);
          }
        });

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error('Supabase initialization error:', err);
      }
    }
  }, [supabaseUrl, supabaseKey]);

  const saveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sb_url', supabaseUrl);
    localStorage.setItem('sb_key', supabaseKey);
    localStorage.setItem('supplier_url', supplierApiUrl);
    localStorage.setItem('supplier_key', supplierApiKey);
    if (supabaseUrl && supabaseKey) {
      const sb = createClient(supabaseUrl, supabaseKey);
      setClient(sb);
      alert(lang === 'ar' ? 'تم حفظ إعدادات Supabase والمورد بنجاح وتنشيط الاتصال!' : 'Supabase and Supplier configuration saved successfully!');
    }
  };

  // Auth handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) {
      alert(lang === 'ar' ? 'الرجاء إدخال بيانات Supabase URL و Anon Key أولاً في تبويب ربط Supabase.' : 'Please configure Supabase URL and Key in the Supabase tab first.');
      setActiveTab('supabase');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data.user) {
          setUser(data.user);
          // Create initial profile row
          await client.from('profiles').upsert({ id: data.user.id, email: authEmail, coins: 0, bonus_coins: 0, total_spent: 0 });
          fetchUserData(client, data.user.id);
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data.user) {
          setUser(data.user);
          fetchUserData(client, data.user.id);
          fetchTransactions(client, data.user.id);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (client) {
      await client.auth.signOut();
    }
    setUser(null);
    setBalance({ coins: 0, bonus_coins: 0, total_spent: 0 });
    setTransactions([]);
  };

  const fetchUserData = async (sb: any, userId: string) => {
    try {
      const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setBalance({
          coins: data.coins || 0,
          bonus_coins: data.bonus_coins || 0,
          total_spent: data.total_spent || 0
        });
      }
    } catch (e) {
      console.log('Profile fetch note:', e);
    }
  };

  const fetchTransactions = async (sb: any, userId: string) => {
    try {
      const { data, error } = await sb.from('coin_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (data) {
        setTransactions(data);
      }
    } catch (e) {
      console.log('Transactions fetch note:', e);
    }
  };

  // Real purchase & Supplier fulfillment dispatch
  const handlePurchase = async (e: React.FormEvent) =  // Create a pending payment request only. Never credit a wallet from a client-side receipt reference.
  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || !receiptRef.trim()) return;
    if (!user || !client) {
      alert(lang === 'ar' ? 'سجّل الدخول أولاً.' : 'Please sign in first.');
      return;
    }
    setCheckoutLoading(true);
    try {
      const request = {
        user_id: user.id,
        username: user.email,
        coins: selectedPkg.coins,
        bonus: selectedPkg.bonus,
        amount_usd: selectedPkg.price_usd,
        currency: 'EGP',
        amount_local: selectedPkg.price_egp,
        payment_method: paymentMethod,
        receipt_ref: receiptRef.trim(),
        proof_image: proofImage || null,
        status: 'pending_review',
        supplier_status: 'not_dispatched'
      };
      const { data, error } = await client.from('coin_transactions').insert([request]).select();
      if (error) throw error;
      setCheckoutSuccess(true);
      await fetchTransactions(client, user.id);
      setTimeout(() => {
        setCheckoutSuccess(false);
        setSelectedPkg(null);
        setReceiptRef('');
        setProofImage('');
        setActiveTab('transactions');
      }, 2200);
    } catch (err: any) {
      alert(err?.message || (lang === 'ar' ? 'تعذر إنشاء طلب المراجعة.' : 'Could not create the review request.'));
    } finally {
      setCheckoutLoading(false);
    }
  };b0b10] text-white font-sans ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#12121a]/95 backdrop-blur-md border-b border-[#252535] px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#fe2c55] to-[#25f4ee] flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Coins className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-wide bg-gradient-to-r from-white via-pink-200 to-cyan-300 bg-clip-text text-transparent">
                TikTok Coin Center Pro
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Supabase + Supplier Active
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {lang === 'ar' ? 'ربط حقيقي 100% مع قاعدة بيانات Supabase والمورد الفعلي والدفع الآمن' : '100% Real Supabase DB, Authentication & Supplier Fulfillment'}
            </p>
          </div>
        </div>

        {/* User Auth Status / Info */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 bg-[#181824] px-4 py-2 rounded-xl border border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-zinc-400 truncate max-w-[120px]">{user.email}</div>
                <div className="text-sm font-bold text-amber-300">
                  {balance.coins.toLocaleString()} <span className="text-xs font-normal text-zinc-400">Coins</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="ml-2 text-zinc-400 hover:text-rose-400 transition-colors p-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('supabase')}
              className="bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] hover:opacity-95 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/20 transition-all"
            >
              {lang === 'ar' ? 'تسجيل الدخول / Supabase' : 'Sign In / Supabase'}
            </button>
          )}

          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-zinc-700"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-[#15151e] p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'store'
                ? 'bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] text-white shadow-lg shadow-pink-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Zap className="w-4 h-4" />
            {lang === 'ar' ? 'متجر شحن العملات' : 'Coin Store'}
          </button>
          
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'wallet'
                ? 'bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] text-white shadow-lg shadow-pink-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {lang === 'ar' ? 'المحفظة والرصيد' : 'Wallet & Balance'}
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'transactions'
                ? 'bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] text-white shadow-lg shadow-pink-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            {lang === 'ar' ? 'سجل الطلبات والمورد' : 'Orders & Supplier'}
          </button>

          <button
            onClick={() => setActiveTab('supplier')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'supplier'
                ? 'bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] text-white shadow-lg shadow-pink-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Server className="w-4 h-4" />
            {lang === 'ar' ? 'إعدادات المورد الفعلي' : 'Supplier API'}
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'supabase'
                ? 'bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] text-white shadow-lg shadow-pink-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Database className="w-4 h-4" />
            {lang === 'ar' ? 'ربط Supabase & Auth' : 'Supabase & Auth'}
          </button>
        </div>

        {/* Tab 1: Store */}
        {activeTab === 'store' && (
          <div className="space-y-8">
            {!user && (
              <div className="bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-200 text-sm">
                      {lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً لإتمام طلب الشحن وربطه بحسابك في Supabase' : 'Please sign in to link your recharge orders to your Supabase account'}
                    </div>
                    <div className="text-xs text-amber-300/80">
                      {lang === 'ar' ? 'انتقل إلى تبويب "ربط Supabase & Auth" لإدخال بيانات مشروعك وتسجيل الدخول.' : 'Go to "Supabase & Auth" tab to configure and sign in.'}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('supabase')}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow"
                >
                  {lang === 'ar' ? 'تسجيل الدخول الآن' : 'Sign In Now'}
                </button>
              </div>
            )}

            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-[#161622] to-zinc-900 border border-zinc-800 p-8 shadow-2xl">
              <div className="absolute right-0 top-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-semibold mb-4 border border-pink-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تنفيذ فوري عبر المورد الرسمي وقاعدة بيانات Supabase' : 'Instant Fulfillment via Official Supplier & Supabase DB'}
                </div>
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 text-white">
                  {lang === 'ar' ? 'متجر شحن عملات تيك توك - ربط حقيقي' : 'TikTok Coin Store - Real Integration'}
                </h2>
                <p className="text-zinc-300 text-sm lg:text-base leading-relaxed">
                  {lang === 'ar' 
                    ? 'الطلبات والمدفوعات يتم حفظها فوريًا في جداول Supabase وإرسالها تلقائياً إلى API المورد الفعلي لتسليم العملات في حسابك خلال أقل من دقيقة.' 
                    : 'Orders and payments are instantly saved in Supabase tables and automatically dispatched to the supplier API for instant delivery.'}
                </p>
              </div>
            </div>

            {/* Packages Grid */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  {lang === 'ar' ? 'اختر باقة العملات' : 'Select Coin Package'}
                </h3>
                <span className="text-xs text-zinc-400">
                  {lang === 'ar' ? 'الأسعار شاملة رسوم التحويل والمورد' : 'Prices include supplier & transfer fees'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {COIN_PACKAGES.map((pkg) => (
                  <div 
                    key={pkg.id}
                    className={`relative rounded-2xl p-6 bg-[#13131c] border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between ${
                      pkg.popular 
                        ? 'border-[#fe2c55] shadow-lg shadow-pink-500/10' 
                        : pkg.bestValue 
                        ? 'border-cyan-500 shadow-lg shadow-cyan-500/10'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                        {lang === 'ar' ? 'الأكثر طلباً ⭐' : 'Most Popular ⭐'}
                      </span>
                    )}
                    {pkg.bestValue && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                        {lang === 'ar' ? 'أفضل قيمة 💎' : 'Best Value 💎'}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                          <Coins className="w-6 h-6 text-amber-400" />
                        </div>
                        {pkg.bonus > 0 && (
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            +{pkg.bonus} {lang === 'ar' ? 'هدية' : 'Bonus'}
                          </span>
                        )}
                      </div>

                      <div className="mb-2">
                        <h4 className="text-2xl font-black text-white">
                          {(pkg.coins + pkg.bonus).toLocaleString()} <span className="text-sm font-normal text-amber-400">Coins</span>
                        </h4>
                        {pkg.bonus > 0 && (
                          <p className="text-xs text-zinc-400">
                            ({pkg.coins} + {pkg.bonus} {lang === 'ar' ? 'مجاناً' : 'free'})
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-white">${pkg.price_usd}</div>
                        <div className="text-xs text-zinc-400">{pkg.price_egp} EGP</div>
                      </div>
                      <button
                        onClick={() => {
                          if (!user) {
                            alert(lang === 'ar' ? 'يجب تسجيل الدخول أولاً لشحن العملات.' : 'Please sign in first to recharge coins.');
                            setActiveTab('supabase');
                            return;
                          }
                          setSelectedPkg(pkg);
                        }}
                        className="bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-pink-600/20 transition-all flex items-center gap-1.5"
                      >
                        {lang === 'ar' ? 'شحن الآن' : 'Recharge'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Wallet */}
        {activeTab === 'wallet' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-gradient-to-br from-[#161622] to-[#111118] border border-zinc-800 p-6 shadow-xl">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{lang === 'ar' ? 'رصيد الحساب (Supabase DB)' : 'Account Balance (Supabase)'}</div>
                <div className="text-4xl font-black text-amber-400 mb-2">
                  {balance.coins.toLocaleString()} <span className="text-sm font-normal text-zinc-300">Coins</span>
                </div>
                <div className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {user?.email || (lang === 'ar' ? 'غير مسجل الدخول' : 'Not logged in')}
                </div>
              </div>

              <div className="rounded-2xl bg-[#13131c] border border-zinc-800 p-6 shadow-xl">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{lang === 'ar' ? 'العملات الإضافية (Bonus)' : 'Bonus Coins'}</div>
                <div className="text-3xl font-bold text-cyan-400 mb-2">
                  +{balance.bonus_coins.toLocaleString()} <span className="text-sm font-normal text-zinc-300">Coins</span>
                </div>
                <p className="text-xs text-zinc-400">
                  {lang === 'ar' ? 'مضافة مباشرة تلقائياً عبر جدول profiles في Supabase.' : 'Synced directly via profiles table in Supabase.'}
                </p>
              </div>

              <div className="rounded-2xl bg-[#13131c] border border-zinc-800 p-6 shadow-xl">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{lang === 'ar' ? 'إجمالي المدفوعات' : 'Total Spent'}</div>
                <div className="text-3xl font-bold text-white mb-2">
                  ${balance.total_spent.toFixed(2)} <span className="text-sm font-normal text-zinc-400">USD</span>
                </div>
                <p className="text-xs text-zinc-400">
                  {lang === 'ar' ? 'موثقة ومؤكدة عبر المورد الفعلي والدفع الإلكتروني.' : 'Verified & confirmed via supplier fulfillment.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Transactions & Supplier Status */}
        {activeTab === 'transactions' && (
          <div className="rounded-2xl bg-[#13131c] border border-zinc-800 p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {lang === 'ar' ? 'سجل الطلبات وإرسال المورد' : 'Orders & Supplier Dispatch Log'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {lang === 'ar' ? 'الطلبات المسجلة في جدول coin_transactions بـ Supabase والمُرسلة للمورد الفعلي' : 'Orders recorded in Supabase coin_transactions and dispatched to supplier'}
                </p>
              </div>
              <button
                onClick={() => user && client && fetchTransactions(client, user.id)}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all border border-zinc-700"
              >
                <RefreshCw className="w-3.5 h-3.5" /> {lang === 'ar' ? 'تحديث' : 'Refresh'}
              </button>
            </div>

            {dispatchStatus && (
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl text-xs text-indigo-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {lang === 'ar' ? 'آخر استجابة من API المورد الفعلي:' : 'Latest Supplier API Response:'}
                </div>
                <pre className="font-mono bg-zinc-950 p-2.5 rounded border border-zinc-800 overflow-x-auto text-[11px] text-cyan-300">
                  {JSON.stringify(dispatchStatus.response, null, 2)}
                </pre>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase">
                    <th className="py-3 px-4">{lang === 'ar' ? 'معرف الطلب' : 'Order ID'}</th>
                    <th className="py-3 px-4">{lang === 'ar' ? 'العملات' : 'Coins'}</th>
                    <th className="py-3 px-4">{lang === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
                    <th className="py-3 px-4">{lang === 'ar' ? 'رقم الإيصال' : 'Receipt Ref'}</th>
                    <th className="py-3 px-4">{lang === 'ar' ? 'حالة المورد' : 'Supplier Status'}</th>
                    <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-zinc-500 text-xs">
                        {lang === 'ar' ? 'لا توجد طلبات مسجلة بعد. قم بشحن باقة جديدة.' : 'No orders recorded yet. Place a recharge order.'}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-zinc-300">{tx.id?.slice(0, 8)}...</td>
                        <td className="py-3.5 px-4 font-bold text-amber-400">
                          +{(tx.coins + tx.bonus).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">{tx.payment_method}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-cyan-300">{tx.receipt_ref}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {tx.supplier_status || 'dispatched'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-400">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Supplier API Configuration */}
        {activeTab === 'supplier' && (
          <div className="rounded-2xl bg-[#13131c] border border-zinc-800 p-6 lg:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {lang === 'ar' ? 'إعدادات المورد الفعلي لتسليم العملات (Supplier API)' : 'Supplier API Fulfillment Setup'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {lang === 'ar' ? 'ربط نقطة النهاية الخاصة بمورد تيك توك لتنفيذ الطلبات تلقائياً' : 'Configure supplier API endpoint for automated order fulfillment'}
                </p>
              </div>
            </div>

            <form onSubmit={saveSupabaseConfig} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Supplier API Endpoint URL</label>
                <input
                  type="text"
                  value={supplierApiUrl}
                  onChange={e => setSupplierApiUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Supplier API Key / Bearer Token</label>
                <input
                  type="password"
                  value={supplierApiKey}
                  onChange={e => setSupplierApiKey(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {lang === 'ar' ? 'حفظ إعدادات المورد' : 'Save Supplier Config'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Supabase & Auth Hub */}
        {activeTab === 'supabase' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Supabase Creds Form */}
            <div className="rounded-2xl bg-[#13131c] border border-zinc-800 p-6 lg:p-8 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {lang === 'ar' ? 'إعدادات ربط Supabase' : 'Supabase Credentials'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {lang === 'ar' ? 'أدخل بيانات مشروعك للاتصال الفعلي بقاعدة البيانات والمصادقة' : 'Enter your project credentials for live DB & Auth connection'}
                  </p>
                </div>
              </div>

              <form onSubmit={saveSupabaseConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Supabase URL</label>
                  <input
                    type="text"
                    required
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzproject.supabase.co"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Supabase Anon Key</label>
                  <input
                    type="password"
                    required
                    value={supabaseKey}
                    onChange={e => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {lang === 'ar' ? 'حفظ وتنشيط اتصال Supabase' : 'Save & Activate Supabase'}
                </button>
              </form>

              {/* SQL Schema helper */}
              <div className="pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  {lang === 'ar' ? 'مخطط SQL المطلوب في Supabase:' : 'Required Supabase SQL Schema:'}
                </h4>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                  <pre>{`create table profiles (
  id uuid primary key,
  email text,
  coins int default 0,
  bonus_coins int default 0,
  total_spent numeric default 0
);

create table coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  username text,
  coins int,
  bonus int,
  amount_usd numeric,
  payment_method text,
  receipt_ref text,
  supplier_status text default 'sent_to_supplier',
  created_at timestamp with time zone default now()
);`}</pre>
                </div>
              </div>
            </div>

            {/* Supabase Authentication Form */}
            <div className="rounded-2xl bg-[#13131c] border border-zinc-800 p-6 lg:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 text-pink-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {lang === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Supabase Authentication'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {lang === 'ar' ? 'مصادقة حقيقية 100% عبر Supabase Auth' : '100% Real Supabase Auth'}
                    </p>
                  </div>
                </div>

                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
                  <button
                    onClick={() => setAuthMode('signin')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all ${authMode === 'signin' ? 'bg-[#fe2c55] text-white' : 'text-zinc-400'}`}
                  >
                    {lang === 'ar' ? 'دخول' : 'Sign In'}
                  </button>
                  <button
                    onClick={() => setAuthMode('signup')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all ${authMode === 'signup' ? 'bg-[#fe2c55] text-white' : 'text-zinc-400'}`}
                  >
                    {lang === 'ar' ? 'تسجيل' : 'Sign Up'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                {authError && (
                  <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] hover:opacity-95 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {authMode === 'signin' ? (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In') : (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account')}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Checkout / Payment Modal */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161622] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 lg:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedPkg(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
            >
              ✕
            </button>

            {checkoutSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {lang === 'ar' ? 'تم إنشاء طلب الدفع وهو قيد المراجعة' : 'Payment request submitted for review'}
                </h3>
                <p className="text-sm text-zinc-300">
                  {lang === 'ar' 
                    ? `تم تسجيل طلبك للمراجعة. لن تُضاف العملات قبل تأكيد الدفع والتسليم.` 
                    : `Your request is pending verification. Coins are not credited until payment and delivery are confirmed.`}
                </p>
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300 font-mono">
                  PENDING REVIEW — NO COINS CREDITED
                </div>
              </div>
            ) : (
              <form onSubmit={handlePurchase} className="space-y-6">
                <div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{lang === 'ar' ? 'تفاصيل الطلب (Supabase + Supplier)' : 'Order Details'}</div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    {(selectedPkg.coins + selectedPkg.bonus).toLocaleString()} TikTok Coins
                  </h3>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    ${selectedPkg.price_usd} USD <span className="text-xs text-zinc-400 font-normal">({selectedPkg.price_egp} EGP)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    {lang === 'ar' ? 'اختر طريقة الدفع' : 'Select Payment Method'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('vodafone_cash')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                        paymentMethod === 'vodafone_cash' 
                          ? 'bg-pink-500/10 border-pink-500 text-white shadow' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-pink-400" />
                      Vodafone Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('instapay')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                        paymentMethod === 'instapay' 
                          ? 'bg-cyan-500/10 border-cyan-500 text-white shadow' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-cyan-400" />
                      InstaPay / IPN
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
                  <div className="font-semibold text-white mb-1">
                    {paymentMethod === 'vodafone_cash' ? 'رقم التحويل (Vodafone Cash):' : 'معرف انستاباي (InstaPay IPN):'}
                  </div>
                  <div className="font-mono text-cyan-300 font-bold text-sm bg-zinc-950 p-2 rounded border border-zinc-800 flex items-center justify-between">
                    <span>{paymentMethod === 'vodafone_cash' ? '01012345678' : 'elhagyosif@instapay'}</span>
                    <button 
                      type="button"
                      onClick={() => navigator.clipboard.writeText(paymentMethod === 'vodafone_cash' ? '01012345678' : 'elhagyosif@instapay')}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-200"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {lang === 'ar' ? 'رقم الإيصال أو مرجع الدفع (Receipt Ref)' : 'Receipt Reference / Transaction ID'}
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptRef}
                    onChange={e => setReceiptRef(e.target.value)}
                    placeholder="e.g. VF-9845123"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPkg(null)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-sm font-semibold transition-all border border-zinc-700"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="flex-1 bg-gradient-to-r from-[#fe2c55] to-[#ff4d6d] hover:opacity-95 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {lang === 'ar' ? 'تأكيد ودفع وإرسال للمورد' : 'Confirm & Dispatch to Supplier'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
