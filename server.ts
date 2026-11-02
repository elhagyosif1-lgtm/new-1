import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health endpoint only. Database writes, payment verification, wallet credits,
// and supplier fulfillment must be implemented server-side with verified credentials.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Coin Center Pro', payments: 'disabled_pending_provider_integration' });
});

app.all('/api/payments/*', (_req, res) => {
  res.status(503).json({ success: false, error: 'Payment verification is not configured. No coins were credited.' });
});

app.all('/api/supabase/*', (_req, res) => {
  res.status(410).json({ success: false, error: 'Client-supplied database proxy disabled for security.' });
});

app.all('/api/user/*', (_req, res) => {
  res.status(410).json({ success: false, error: 'Wallet API is not configured.' });
});

app.all('/api/transactions', (_req, res) => {
  res.status(410).json({ success: false, error: 'Transaction API is not configured.' });
});

export default app;
