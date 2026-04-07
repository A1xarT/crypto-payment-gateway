import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function renderCheckoutPage(request: Request, response: Response): Promise<void> {
  const { id } = request.params as { id: string };

  const session = await prisma.checkoutSession.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
    },
  });

  if (!session) {
    response.status(404).send('<h1>Checkout session not found</h1>');
    return;
  }

  // If the session is already resolved, redirect immediately
  if (session.status === 'PAID') {
    response.redirect(session.successUrl);
    return;
  }
  if (session.status === 'EXPIRED' || session.status === 'CANCELLED') {
    response.redirect(session.cancelUrl);
    return;
  }

  const paymentId = session.paymentId;

  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Payment</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.10); padding: 36px 32px; max-width: 440px; width: 100%; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .amount { font-size: 36px; font-weight: 800; color: #1d4ed8; margin: 12px 0; }
    .pay-link { display: block; text-align: center; margin: 24px 0 8px; padding: 14px; background: #1d4ed8; color: white; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .pay-link:hover { background: #1e40af; }
    .cancel-link { display: block; text-align: center; color: #6b7280; font-size: 14px; margin-top: 12px; cursor: pointer; text-decoration: underline; }
    .status-banner { border-radius: 8px; padding: 12px 16px; font-size: 14px; margin-bottom: 16px; display: none; }
    .status-banner.success { background: #dcfce7; color: #166534; display: block; }
    .status-banner.expired  { background: #fee2e2; color: #991b1b; display: block; }
    .expires { font-size: 13px; color: #6b7280; margin-top: 8px; }
    #countdown { font-weight: 600; color: #374151; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Complete your payment</h1>
    <div class="amount" id="amount">Loading…</div>
    <p class="expires">Session expires in <span id="countdown">—</span></p>

    <div id="status-banner" class="status-banner"></div>

    <a id="pay-link" class="pay-link" href="/pay/${paymentId}">Open payment page</a>
    <a class="cancel-link" onclick="cancelSession()">Cancel and go back</a>
  </div>

  <script>
    const SESSION_ID = ${JSON.stringify(id)};
    const PAYMENT_ID = ${JSON.stringify(paymentId)};
    const CANCEL_URL = ${JSON.stringify(session.cancelUrl)};
    const SUCCESS_URL = ${JSON.stringify(session.successUrl)};
    const EXPIRES_AT  = new Date(${JSON.stringify(session.expiresAt.toISOString())});

    async function pollStatus() {
      try {
        const resp = await fetch('/api/v1/checkout/sessions/' + SESSION_ID + '/status');
        const json = await resp.json();
        const status = json.data?.status;
        if (status === 'PAID') {
          showBanner('success', 'Payment confirmed! Redirecting…');
          setTimeout(() => window.location.href = SUCCESS_URL, 1500);
        } else if (status === 'EXPIRED' || status === 'CANCELLED') {
          showBanner('expired', 'Session expired. Redirecting…');
          setTimeout(() => window.location.href = CANCEL_URL, 1500);
        }
      } catch { /* ignore network errors */ }
    }

    function showBanner(type, message) {
      const banner = document.getElementById('status-banner');
      banner.className = 'status-banner ' + type;
      banner.textContent = message;
    }

    function updateCountdown() {
      const diffMs = EXPIRES_AT - Date.now();
      if (diffMs <= 0) {
        document.getElementById('countdown').textContent = 'expired';
        return;
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      document.getElementById('countdown').textContent =
        minutes + ':' + String(seconds).padStart(2, '0');
    }

    async function loadPaymentAmount() {
      try {
        const resp = await fetch('/api/v1/payments/' + PAYMENT_ID, {
          headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || '') }
        });
        const json = await resp.json();
        if (json.data?.amount) {
          document.getElementById('amount').textContent = json.data.amount + ' ETH';
        }
      } catch { document.getElementById('amount').textContent = '—'; }
    }

    function cancelSession() {
      if (confirm('Cancel this payment and return to the merchant?')) {
        window.location.href = CANCEL_URL;
      }
    }

    loadPaymentAmount();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    setInterval(pollStatus, 3000);
  </script>
</body>
</html>`);
}
