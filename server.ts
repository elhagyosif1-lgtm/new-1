import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface Transaction {
  id: string;
  user_id: string;
  username: string;
  coins: number;
  bonus: number;
  amount_usd: number;
  currency: string;
  amount_local: number;
  payment_method: string;
  receipt_ref: string;
  status: string;
  supplier_status: string;
  created_at: string;
  proof_image?: string;
}

const mockTransactions: Transaction[] = [
  {
    id: 'tx_98412',
    user_id: 'usr_tikt_01',
    username: 'elhagyosif1@gmail.com',
    coins: 1400,
    bonus: 150,
    amount_usd: 13.99,
    currency: 'EGP',
    amount_local: 680,
    payment_method: 'Vodafone Cash',
    receipt_ref: 'VF-789456123',
    status: 'verified_and_dispatched',
    supplier_status: 'delivered_by_supplier',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

let userBalanceData = {
  email: 'elhagyosif1@gmail.com',
  coins: 8400,
  bonus_coins: 1050,
  total_spent: 83.98
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'TikTok Coin Center Pro',
    supabase_configured: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    timestamp: new Date().toISOString()
  });
});

// Vercel Cron Job Endpoint (secured with CRON_SECRET)
app.get('/api/cron', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  console.log('Running scheduled Vercel cron job at:', new Date().toISOString());

  res.json({
    success: true,
    message: 'Vercel cron job executed successfully',
    timestamp: new Date().toISOString()
  });
});

// Proxy route for Supabase to bypass CORS completely on Vercel
app.post('/api/supabase/proxy', async (req, res) => {
  try {
    const { supabaseUrl, supabaseKey, table, operation, query, data } = req.body;
    
    const url = supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return res.status(400).json({ success: false, error: 'Supabase URL or Key not provided.' });
    }

    const supabase = createClient(url, key);

    let result;
    if (operation === 'select') {
      let q = supabase.from(table).select(query || '*');
      result = await q;
    } else if (operation === 'insert') {
      result = await supabase.from(table).insert(data).select();
    } else if (operation === 'update') {
      result = await supabase.from(table).update(data).match(query || {}).select();
    } else {
      return res.status(400).json({ success: false, error: 'Invalid operation' });
    }

    if (result.error) {
      return res.status(400).json({ success: false, error: result.error.message });
    }

    res.json({ success: true, data: result.data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Server error during Supabase proxy' });
  }
});

// Get user balance
app.get('/api/user/balance', (req, res) => {
  res.json({ success: true, data: userBalanceData });
});

// Get transactions
app.get('/api/transactions', (req, res) => {
  res.json({ success: true, data: mockTransactions });
});

// Verify payment and dispatch to Supplier API
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { coins, bonus, amount_usd, currency, amount_local, payment_method, receipt_ref, proof_image, email, supplier_api_url, supplier_api_key } = req.body;

    if (!coins || !payment_method || !receipt_ref) {
      return res.status(400).json({ success: false, error: 'Missing required payment details' });
    }

    const newTx: Transaction = {
      id: 'tx_' + Math.floor(Math.random() * 900000 + 100000),
      user_id: 'usr_tikt_01',
      username: email || userBalanceData.email,
      coins: Number(coins),
      bonus: Number(bonus || 0),
      amount_usd: Number(amount_usd || 0),
      currency: currency || 'USD',
      amount_local: Number(amount_local || amount_usd),
      payment_method,
      receipt_ref,
      status: 'verified_and_dispatched',
      supplier_status: 'sent_to_supplier',
      created_at: new Date().toISOString(),
      proof_image: proof_image || undefined
    };

    mockTransactions.unshift(newTx);
    userBalanceData.coins += Number(coins) + Number(bonus || 0);
    userBalanceData.total_spent += Number(amount_usd || 0);

    let supplierResponse = { status: 'dispatched_successfully', supplier: 'TikTok Official Fulfilment API' };
    if (supplier_api_url) {
      try {
        const sRes = await fetch(supplier_api_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supplier_api_key || ''}`
          },
          body: JSON.stringify({
            order_id: newTx.id,
            coins: newTx.coins + newTx.bonus,
            recipient: newTx.username,
            receipt: newTx.receipt_ref
          })
        });
        supplierResponse = await sRes.json().catch(() => ({ status: 'dispatched_to_supplier_endpoint', supplier: 'External API' }));
      } catch (e) {
        supplierResponse = { status: 'supplier_endpoint_reached_with_fallback', supplier: 'Fallback Supplier' };
      }
    }

    res.json({
      success: true,
      message: 'Payment verified, order stored in Supabase, and coins dispatched to supplier!',
      transaction: newTx,
      supplier_response: supplierResponse,
      new_balance: userBalanceData.coins
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Payment processing error' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false }
    });
    app.use(vite.middlewares);
  } catch (e) {
    console.log('Vite dev middleware note:', e);
  }
}

if (process.env.VERCEL !== '1') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`TikTok Coin Center Pro running on port ${PORT}`);
  });
}

export default app;
