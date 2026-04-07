import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { paymentService } from '../services/paymentService';
import { PaymentResult } from '../services/paymentService';

// EIP-681 URI so wallets can pre-fill the address and amount when scanning
function buildEthPaymentUri(address: string, amountEth: string): string {
  const wei = BigInt(Math.round(parseFloat(amountEth) * 1e18));
  return `ethereum:${address}?value=${wei}`;
}

function buildPaymentHtml(payment: PaymentResult, qrDataUrl: string): string {
  const expiresAtMs = payment.expiresAt ? new Date(payment.expiresAt).getTime() : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pay ${payment.amount} ${payment.currency}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .test-banner {
      background: #854d0e;
      color: #fef08a;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: center;
      padding: 8px;
      border-radius: 8px 8px 0 0;
    }

    .card {
      background: #141414;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
    }

    .card.test-mode {
      border-color: #854d0e;
      border-radius: 0 0 16px 16px;
      padding-top: 32px;
    }

    .logo { font-size: 13px; color: #555; letter-spacing: 0.05em; margin-bottom: 28px; }

    .amount {
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }

    .currency { font-size: 14px; color: #888; margin-bottom: 28px; }

    .qr-wrap {
      background: #fff;
      border-radius: 12px;
      display: inline-flex;
      padding: 12px;
      margin-bottom: 24px;
    }

    .qr-wrap img { display: block; width: 180px; height: 180px; }

    .address-label { font-size: 12px; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; }

    .address-box {
      background: #1e1e1e;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 12px 14px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px;
      color: #ccc;
      word-break: break-all;
      margin-bottom: 10px;
    }

    .copy-btn {
      background: #1e1e1e;
      border: 1px solid #333;
      color: #aaa;
      font-size: 13px;
      border-radius: 6px;
      padding: 8px 18px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      margin-bottom: 28px;
    }

    .copy-btn:hover { background: #2a2a2a; color: #fff; }

    .divider { border: none; border-top: 1px solid #222; margin-bottom: 24px; }

    .timer-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }

    .timer {
      font-size: 28px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: #f0a000;
      margin-bottom: 20px;
    }

    .timer.urgent { color: #ef4444; }

    .status-row { display: flex; align-items: center; justify-content: center; gap: 8px; color: #888; font-size: 14px; }

    .spinner {
      width: 16px; height: 16px;
      border: 2px solid #333;
      border-top-color: #888;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Confirmed state */
    .icon-confirmed { font-size: 64px; margin-bottom: 16px; }
    .confirmed-title { font-size: 26px; font-weight: 700; color: #22c55e; margin-bottom: 8px; }
    .confirmed-sub { font-size: 14px; color: #666; }

    /* Expired state */
    .icon-expired { font-size: 64px; margin-bottom: 16px; }
    .expired-title { font-size: 26px; font-weight: 700; color: #ef4444; margin-bottom: 8px; }
    .expired-sub { font-size: 14px; color: #666; }

    .hidden { display: none !important; }
  </style>
</head>
<body>
${payment.network === 'TESTNET' ? '<div class="test-banner">⚠ Test Mode — Sepolia Testnet</div>' : ''}
<div class="card${payment.network === 'TESTNET' ? ' test-mode' : ''}">
  <div class="logo">CRYPTO GATEWAY</div>

  <!-- PENDING STATE -->
  <div id="state-pending">
    <div class="amount">${payment.amount}</div>
    <div class="currency">${payment.currency} requested</div>

    <div class="qr-wrap">
      <img src="${qrDataUrl}" alt="Scan to pay" />
    </div>

    <div class="address-label">Send to this address</div>
    <div class="address-box" id="address">${payment.address}</div>
    <button class="copy-btn" onclick="copyAddress()">Copy Address</button>

    <hr class="divider" />

    <div id="timer-section">
      <div class="timer-label">Expires in</div>
      <div class="timer" id="timer">--:--</div>
    </div>

    <div class="status-row">
      <div class="spinner"></div>
      <span>Waiting for payment…</span>
    </div>
  </div>

  <!-- CONFIRMED STATE -->
  <div id="state-confirmed" class="hidden">
    <div class="icon-confirmed">✅</div>
    <div class="confirmed-title">Payment Received</div>
    <div class="confirmed-sub">${payment.amount} ${payment.currency} confirmed on-chain</div>
  </div>

  <!-- EXPIRED STATE -->
  <div id="state-expired" class="hidden">
    <div class="icon-expired">⏰</div>
    <div class="expired-title">Payment Expired</div>
    <div class="expired-sub">The payment window has closed. Please start a new payment.</div>
  </div>
</div>

<script>
  const PAYMENT_ID   = ${JSON.stringify(payment.id)};
  const EXPIRES_AT   = ${expiresAtMs};
  const INITIAL_STATUS = ${JSON.stringify(payment.status)};
  const POLL_INTERVAL_MS = 3000;

  function showState(state) {
    document.getElementById('state-pending').classList.toggle('hidden', state !== 'PENDING');
    document.getElementById('state-confirmed').classList.toggle('hidden', state !== 'CONFIRMED');
    document.getElementById('state-expired').classList.toggle('hidden', state !== 'EXPIRED');
  }

  function copyAddress() {
    const address = document.getElementById('address').textContent.trim();
    navigator.clipboard.writeText(address).then(() => {
      const btn = document.querySelector('.copy-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy Address'; }, 2000);
    });
  }

  // Countdown timer — ticks every second
  function updateTimer() {
    if (!EXPIRES_AT) return;
    const remaining = Math.max(0, Math.floor((EXPIRES_AT - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('timer');
    timerEl.textContent = minutes + ':' + seconds;
    timerEl.classList.toggle('urgent', remaining < 60);
  }

  // Poll the status endpoint
  async function pollStatus() {
    try {
      const response = await fetch('/pay/' + PAYMENT_ID + '/status');
      if (!response.ok) return;
      const body = await response.json();
      const status = body.data && body.data.status;
      if (status === 'CONFIRMED' || status === 'EXPIRED') {
        clearInterval(pollHandle);
        clearInterval(timerHandle);
        showState(status);
      }
    } catch (_) {
      // Network error — keep polling
    }
  }

  // Initialise
  if (INITIAL_STATUS === 'CONFIRMED' || INITIAL_STATUS === 'EXPIRED') {
    showState(INITIAL_STATUS);
  } else {
    showState('PENDING');
    updateTimer();
    var timerHandle = setInterval(updateTimer, 1000);
    var pollHandle  = setInterval(pollStatus, POLL_INTERVAL_MS);
  }
</script>
</body>
</html>`;
}

export const payPageController = {
  async renderPaymentPage(request: Request, response: Response): Promise<void> {
    const { id } = request.params as { id: string };
    const payment = await paymentService.getPaymentById(id);

    if (!payment) {
      response.status(404).send('<h1 style="font-family:sans-serif;padding:40px">Payment not found</h1>');
      return;
    }

    const ethUri = buildEthPaymentUri(payment.address, payment.amount);
    const qrDataUrl = await QRCode.toDataURL(ethUri, { width: 200, margin: 2 });

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(buildPaymentHtml(payment, qrDataUrl));
  },

  async getPaymentStatus(request: Request, response: Response): Promise<void> {
    const { id } = request.params as { id: string };
    const payment = await paymentService.getPaymentById(id);

    if (!payment) {
      response.status(404).json({ success: false, error: 'Payment not found' });
      return;
    }

    response.json({
      success: true,
      data: { status: payment.status, expiresAt: payment.expiresAt },
    });
  },
};
