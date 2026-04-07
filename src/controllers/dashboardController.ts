import { Request, Response } from 'express';

export const dashboardController = {
  renderDashboard(_request: Request, response: Response): void {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(DASHBOARD_HTML);
  },
};

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crypto Gateway — Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      font-size: 14px;
    }

    /* ── Sidebar ─────────────────────────────── */
    .sidebar {
      width: 220px;
      flex-shrink: 0;
      background: #111;
      border-right: 1px solid #1e1e1e;
      display: flex;
      flex-direction: column;
      padding: 24px 0;
      position: fixed;
      top: 0; left: 0; bottom: 0;
    }

    .sidebar-logo {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #fff;
      text-transform: uppercase;
      padding: 0 20px 24px;
      border-bottom: 1px solid #1e1e1e;
      margin-bottom: 12px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      color: #777;
      cursor: pointer;
      border-radius: 0;
      transition: background 0.1s, color 0.1s;
      border-left: 2px solid transparent;
      user-select: none;
    }

    .nav-item:hover { background: #1a1a1a; color: #ccc; }
    .nav-item.active { color: #fff; border-left-color: #3b82f6; background: #151515; }

    .sidebar-bottom {
      margin-top: auto;
      padding: 16px 20px;
      border-top: 1px solid #1e1e1e;
    }

    .user-email { font-size: 12px; color: #555; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .btn-logout {
      background: none;
      border: 1px solid #333;
      color: #777;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 5px;
      cursor: pointer;
      width: 100%;
      transition: background 0.1s, color 0.1s;
    }

    .btn-logout:hover { background: #1e1e1e; color: #ccc; }

    /* ── Main ────────────────────────────────── */
    .main { margin-left: 220px; flex: 1; padding: 32px; min-width: 0; }

    .page-title { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 24px; }

    /* ── Login screen ───────────────────────── */
    #login-screen {
      position: fixed; inset: 0;
      background: #0a0a0a;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .login-card {
      background: #141414;
      border: 1px solid #2a2a2a;
      border-radius: 14px;
      padding: 40px 36px;
      width: 360px;
    }

    .login-card h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
    .login-card p { font-size: 13px; color: #666; margin-bottom: 28px; }

    /* ── Form elements ───────────────────────── */
    label { display: block; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }

    input, select {
      display: block;
      width: 100%;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 7px;
      color: #e5e5e5;
      font-size: 14px;
      padding: 10px 12px;
      margin-bottom: 16px;
      outline: none;
      transition: border-color 0.15s;
    }

    input:focus, select:focus { border-color: #3b82f6; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-danger { background: #7f1d1d; color: #fca5a5; }
    .btn-danger:hover:not(:disabled) { background: #991b1b; }
    .btn-ghost { background: #1e1e1e; color: #aaa; border: 1px solid #2a2a2a; }
    .btn-ghost:hover:not(:disabled) { background: #2a2a2a; color: #fff; }
    .btn-full { width: 100%; justify-content: center; }

    .error-msg { color: #f87171; font-size: 13px; margin-bottom: 14px; min-height: 20px; }

    /* ── Cards ───────────────────────────────── */
    .card {
      background: #141414;
      border: 1px solid #1e1e1e;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .card-title { font-size: 15px; font-weight: 600; color: #fff; }

    /* ── Tables ──────────────────────────────── */
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.07em; padding: 0 12px 10px; }
    td { padding: 12px; border-top: 1px solid #1e1e1e; color: #ccc; font-size: 13px; }
    tr:hover td { background: #181818; }

    .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }

    /* ── Badges ──────────────────────────────── */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .badge-pending    { background: #1e3a5f; color: #93c5fd; }
    .badge-confirmed  { background: #14532d; color: #86efac; }
    .badge-expired    { background: #292524; color: #a8a29e; }
    .badge-failed     { background: #450a0a; color: #fca5a5; }
    .badge-mainnet    { background: #1e1b4b; color: #a5b4fc; }
    .badge-testnet    { background: #431407; color: #fed7aa; }
    .badge-active     { background: #14532d; color: #86efac; }
    .badge-inactive   { background: #292524; color: #a8a29e; }
    .badge-delivered  { background: #14532d; color: #86efac; }
    .badge-secret     { background: #1e3a5f; color: #93c5fd; }
    .badge-publishable { background: #1e1b4b; color: #a5b4fc; }

    /* ── Pagination ──────────────────────────── */
    .pagination { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
    .pagination span { font-size: 13px; color: #666; }

    /* ── Empty state ─────────────────────────── */
    .empty { text-align: center; padding: 48px 0; color: #555; font-size: 14px; }

    /* ── Modal ───────────────────────────────── */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 50;
    }

    .modal {
      background: #141414;
      border: 1px solid #2a2a2a;
      border-radius: 14px;
      padding: 32px;
      width: 420px;
      max-width: 90vw;
    }

    .modal h2 { font-size: 17px; font-weight: 700; margin-bottom: 20px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

    .key-reveal {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 8px;
    }

    .key-reveal .key-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
    .key-reveal .key-value { font-family: 'SF Mono', monospace; font-size: 12px; color: #e5e5e5; word-break: break-all; }

    .warning-box {
      background: #1c1408;
      border: 1px solid #854d0e;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      color: #fbbf24;
      margin-bottom: 20px;
    }

    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .section-tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 1px solid #1e1e1e; }
    .section-tab { padding: 8px 18px; font-size: 13px; color: #666; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .section-tab.active { color: #fff; border-bottom-color: #3b82f6; }
  </style>
</head>
<body>

<!-- Login screen -->
<div id="login-screen">
  <div class="login-card">
    <h1>Crypto Gateway</h1>
    <p>Sign in to your merchant account</p>
    <div id="login-error" class="error-msg"></div>
    <label>Email</label>
    <input type="email" id="login-email" placeholder="you@example.com" />
    <label>Password</label>
    <input type="password" id="login-password" placeholder="••••••••" />
    <button class="btn btn-primary btn-full" id="login-btn" onclick="doLogin()">Sign in</button>
  </div>
</div>

<!-- Dashboard shell (hidden until logged in) -->
<div id="dashboard-shell" style="display:none;width:100%;display:none">

  <aside class="sidebar">
    <div class="sidebar-logo">⬡ Crypto Gateway</div>
    <div class="nav-item active" onclick="switchTab('payments')" id="nav-payments">💳 Payments</div>
    <div class="nav-item" onclick="switchTab('webhooks')" id="nav-webhooks">🔗 Webhooks</div>
    <div class="nav-item" onclick="switchTab('apikeys')" id="nav-apikeys">🔑 API Keys</div>
    <div class="nav-item" onclick="switchTab('analytics')" id="nav-analytics">📊 Analytics</div>
    <div class="nav-item" onclick="switchTab('account')" id="nav-account">⚙ Account</div>
    <div class="nav-item" onclick="switchTab('admin')" id="nav-admin" style="display:none">🛡 Admin</div>
    <div class="sidebar-bottom">
      <div class="user-email" id="user-email-display"></div>
      <button class="btn-logout" onclick="logout()">Sign out</button>
    </div>
  </aside>

  <main class="main">

    <!-- PAYMENTS TAB -->
    <div class="tab-content active" id="tab-payments">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <h1 class="page-title" style="margin:0">Payments</h1>
        <div style="display:flex;gap:10px;align-items:center">
          <select id="filter-network" onchange="loadPayments(1)" style="width:130px;margin:0">
            <option value="">All networks</option>
            <option value="MAINNET">Mainnet</option>
            <option value="TESTNET">Testnet</option>
          </select>
          <select id="filter-status" onchange="loadPayments(1)" style="width:130px;margin:0">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="EXPIRED">Expired</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Network</th>
              <th>Created</th>
              <th>Expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="payments-tbody">
            <tr><td colspan="7" class="empty">Loading…</td></tr>
          </tbody>
        </table>
        <div class="pagination">
          <button class="btn btn-ghost" id="payments-prev" onclick="loadPayments(currentPaymentsPage - 1)">← Prev</button>
          <span id="payments-page-info"></span>
          <button class="btn btn-ghost" id="payments-next" onclick="loadPayments(currentPaymentsPage + 1)">Next →</button>
        </div>
      </div>
    </div>

    <!-- WEBHOOKS TAB -->
    <div class="tab-content" id="tab-webhooks">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <h1 class="page-title" style="margin:0">Webhooks</h1>
        <button class="btn btn-primary" onclick="openNewWebhookModal()">+ Register endpoint</button>
      </div>
      <div class="card">
        <table>
          <thead>
            <tr><th>URL</th><th>Status</th><th>Created</th><th></th></tr>
          </thead>
          <tbody id="webhooks-tbody">
            <tr><td colspan="4" class="empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
      <div id="deliveries-section" style="display:none">
        <h2 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:16px">Delivery History</h2>
        <div class="card">
          <table>
            <thead>
              <tr><th>Payment</th><th>Status</th><th>Response</th><th>Attempts</th><th>Next Retry</th><th>Date</th></tr>
            </thead>
            <tbody id="deliveries-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- API KEYS TAB -->
    <div class="tab-content" id="tab-apikeys">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <h1 class="page-title" style="margin:0">API Keys</h1>
        <button class="btn btn-primary" onclick="openGenerateKeyModal()">+ Generate key pair</button>
      </div>
      <div class="card">
        <table>
          <thead>
            <tr><th>Name</th><th>Prefix</th><th>Type</th><th>Last Used</th><th>Status</th><th></th></tr>
          </thead>
          <tbody id="apikeys-tbody">
            <tr><td colspan="6" class="empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ANALYTICS TAB -->
    <div class="tab-content" id="tab-analytics">
      <h1 class="page-title">Analytics</h1>

      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:28px">
        <div class="card" style="padding:20px;margin:0">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Total Revenue</div>
          <div style="font-size:26px;font-weight:700;color:#fff" id="stat-revenue">—</div>
          <div style="font-size:12px;color:#555;margin-top:2px">ETH confirmed</div>
        </div>
        <div class="card" style="padding:20px;margin:0">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Conversion Rate</div>
          <div style="font-size:26px;font-weight:700;color:#22c55e" id="stat-conversion">—</div>
          <div style="font-size:12px;color:#555;margin-top:2px">confirmed / finalised</div>
        </div>
        <div class="card" style="padding:20px;margin:0">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Total Payments</div>
          <div style="font-size:26px;font-weight:700;color:#fff" id="stat-total">—</div>
          <div style="font-size:12px;color:#555;margin-top:2px">all time</div>
        </div>
        <div class="card" style="padding:20px;margin:0">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Confirmed</div>
          <div style="font-size:26px;font-weight:700;color:#86efac" id="stat-confirmed">—</div>
          <div style="font-size:12px;color:#555;margin-top:2px">payments</div>
        </div>
        <div class="card" style="padding:20px;margin:0">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Expired</div>
          <div style="font-size:26px;font-weight:700;color:#a8a29e" id="stat-expired">—</div>
          <div style="font-size:12px;color:#555;margin-top:2px">payments</div>
        </div>
        <div class="card" style="padding:20px;margin:0">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Pending</div>
          <div style="font-size:26px;font-weight:700;color:#93c5fd" id="stat-pending">—</div>
          <div style="font-size:12px;color:#555;margin-top:2px">payments</div>
        </div>
      </div>

      <!-- Network breakdown -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px">
        <div class="card" style="margin:0">
          <div class="card-header"><span class="card-title">Mainnet</span><span class="badge badge-mainnet">MAINNET</span></div>
          <div style="display:flex;gap:32px">
            <div><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Payments</div><div style="font-size:20px;font-weight:600" id="net-mainnet-total">—</div></div>
            <div><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Confirmed</div><div style="font-size:20px;font-weight:600;color:#86efac" id="net-mainnet-confirmed">—</div></div>
            <div><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Revenue</div><div style="font-size:20px;font-weight:600" id="net-mainnet-revenue">—</div></div>
          </div>
        </div>
        <div class="card" style="margin:0">
          <div class="card-header"><span class="card-title">Testnet</span><span class="badge badge-testnet">TESTNET</span></div>
          <div style="display:flex;gap:32px">
            <div><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Payments</div><div style="font-size:20px;font-weight:600" id="net-testnet-total">—</div></div>
            <div><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Confirmed</div><div style="font-size:20px;font-weight:600;color:#86efac" id="net-testnet-confirmed">—</div></div>
            <div><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Revenue</div><div style="font-size:20px;font-weight:600" id="net-testnet-revenue">—</div></div>
          </div>
        </div>
      </div>

      <!-- Volume chart -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Daily Volume (last 30 days)</span>
          <span style="font-size:12px;color:#555">Confirmed payments</span>
        </div>
        <svg id="volume-chart" width="100%" height="160" style="display:block;overflow:visible"></svg>
        <div id="chart-empty" style="display:none;text-align:center;padding:40px 0;color:#555;font-size:13px">No confirmed payments in this period</div>
      </div>
    </div>

    <!-- ACCOUNT TAB -->
    <div class="tab-content" id="tab-account">
      <h1 class="page-title">Account</h1>
      <div class="card" style="max-width:520px">
        <div class="card-header"><span class="card-title">Profile</span></div>
        <label>Email</label>
        <input type="text" id="account-email" readonly style="color:#666;cursor:default" />
        <label>Member since</label>
        <input type="text" id="account-created" readonly style="color:#666;cursor:default" />
      </div>
      <div class="card" style="max-width:520px">
        <div class="card-header"><span class="card-title">Payout Address</span></div>
        <p style="font-size:13px;color:#666;margin-bottom:16px">
          Confirmed ETH payments are automatically swept to this address.
        </p>
        <div id="payout-error" class="error-msg"></div>
        <label>Ethereum Address</label>
        <input type="text" id="payout-address-input" placeholder="0x..." />
        <button class="btn btn-primary" onclick="savePayoutAddress()">Save address</button>
        <span id="payout-success" style="font-size:13px;color:#86efac;margin-left:12px;display:none">Saved!</span>
      </div>
    </div>

    <!-- ADMIN TAB -->
    <div class="tab-content" id="tab-admin">
      <h1 class="page-title">Admin</h1>

      <div class="section-tabs">
        <div class="section-tab active" onclick="switchAdminTab('users')" id="atab-users">Users</div>
        <div class="section-tab" onclick="switchAdminTab('payments')" id="atab-payments">All Payments</div>
        <div class="section-tab" onclick="switchAdminTab('sweeps')" id="atab-sweeps">Failed Sweeps</div>
      </div>

      <div class="tab-content active" id="admin-tab-users">
        <div class="card">
          <table>
            <thead><tr><th>Email</th><th>Payout Address</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody id="admin-users-tbody"><tr><td colspan="4" class="empty">Loading…</td></tr></tbody>
          </table>
          <div class="pagination">
            <button class="btn btn-ghost" id="admin-users-prev" onclick="loadAdminUsers(currentAdminUsersPage - 1)">← Prev</button>
            <span id="admin-users-page-info"></span>
            <button class="btn btn-ghost" id="admin-users-next" onclick="loadAdminUsers(currentAdminUsersPage + 1)">Next →</button>
          </div>
        </div>
      </div>

      <div class="tab-content" id="admin-tab-payments">
        <div style="display:flex;gap:10px;margin-bottom:16px">
          <select id="admin-filter-status" onchange="loadAdminPayments(1)" style="width:160px;margin:0">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="EXPIRED">Expired</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div class="card">
          <table>
            <thead><tr><th>Merchant</th><th>Amount</th><th>Status</th><th>Network</th><th>Created</th></tr></thead>
            <tbody id="admin-payments-tbody"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
          </table>
          <div class="pagination">
            <button class="btn btn-ghost" id="admin-payments-prev" onclick="loadAdminPayments(currentAdminPaymentsPage - 1)">← Prev</button>
            <span id="admin-payments-page-info"></span>
            <button class="btn btn-ghost" id="admin-payments-next" onclick="loadAdminPayments(currentAdminPaymentsPage + 1)">Next →</button>
          </div>
        </div>
      </div>

      <div class="tab-content" id="admin-tab-sweeps">
        <div class="card">
          <table>
            <thead><tr><th>Merchant</th><th>Payment</th><th>Amount</th><th>Network</th><th>Error</th><th>Date</th></tr></thead>
            <tbody id="admin-sweeps-tbody"><tr><td colspan="6" class="empty">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

  </main>
</div>

<!-- Modal: New Webhook -->
<div class="modal-overlay" id="modal-webhook" style="display:none" onclick="if(event.target===this)closeModal('modal-webhook')">
  <div class="modal">
    <h2>Register Webhook</h2>
    <div id="webhook-error" class="error-msg"></div>
    <label>Callback URL</label>
    <input type="url" id="webhook-url-input" placeholder="https://yourapp.com/webhooks/crypto" />
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-webhook')">Cancel</button>
      <button class="btn btn-primary" onclick="createWebhook()">Register</button>
    </div>
  </div>
</div>

<!-- Modal: Generate API Key -->
<div class="modal-overlay" id="modal-apikey" style="display:none" onclick="if(event.target===this)closeModal('modal-apikey')">
  <div class="modal">
    <h2>Generate Key Pair</h2>
    <div id="apikey-error" class="error-msg"></div>
    <label>Name / Label</label>
    <input type="text" id="apikey-name-input" placeholder="e.g. Production" />
    <label>Mode</label>
    <select id="apikey-mode-input">
      <option value="live">Live (mainnet — sk_live_...)</option>
      <option value="test">Test (Sepolia — sk_test_...)</option>
    </select>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-apikey')">Cancel</button>
      <button class="btn btn-primary" onclick="generateKeyPair()">Generate</button>
    </div>
  </div>
</div>

<!-- Modal: Show new API keys -->
<div class="modal-overlay" id="modal-apikey-reveal" style="display:none">
  <div class="modal">
    <h2>Your New API Keys</h2>
    <div class="warning-box">⚠ Save these keys now — they will not be shown again.</div>
    <div id="key-reveal-content"></div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal('modal-apikey-reveal');loadApiKeys()">Done</button>
    </div>
  </div>
</div>

<!-- Modal: Webhook secret reveal -->
<div class="modal-overlay" id="modal-webhook-secret" style="display:none">
  <div class="modal">
    <h2>Webhook Registered</h2>
    <div class="warning-box">⚠ Save your signing secret — it will not be shown again.</div>
    <div id="webhook-secret-content"></div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal('modal-webhook-secret');loadWebhooks()">Done</button>
    </div>
  </div>
</div>

<script>
  const API = '/api/v1';
  let token = null;
  let currentPaymentsPage = 1;
  let selectedWebhookId = null;

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function doLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    const btn      = document.getElementById('login-btn');

    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    try {
      const res  = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        errEl.textContent = body.error || 'Login failed';
        return;
      }

      token = body.data.token;
      localStorage.setItem('cgw_token', token);
      document.getElementById('user-email-display').textContent = body.data.user.email;
      showDashboard();
    } catch {
      errEl.textContent = 'Network error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }

  function logout() {
    localStorage.removeItem('cgw_token');
    token = null;
    document.getElementById('dashboard-shell').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  }

  async function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-shell').style.display = 'flex';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.isAdmin) document.getElementById('nav-admin').style.display = 'flex';
    } catch {}
    await Promise.all([loadAccount(), loadPayments(1)]);
  }

  function api(path, options = {}) {
    return fetch(API + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        ...(options.headers || {}),
      },
    }).then(r => r.json());
  }

  // ── Tab switching ─────────────────────────────────────────────────────────

  function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('nav-' + tab).classList.add('active');

    if (tab === 'payments')  loadPayments(1);
    if (tab === 'webhooks')  loadWebhooks();
    if (tab === 'apikeys')   loadApiKeys();
    if (tab === 'account')   loadAccount();
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'admin')     { switchAdminTab('users'); }
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  async function loadAnalytics() {
    const [summaryRes, volumeRes] = await Promise.all([
      api('/analytics/summary'),
      api('/analytics/volume?days=30'),
    ]);

    if (summaryRes.success) {
      const s = summaryRes.data;
      document.getElementById('stat-revenue').textContent    = s.totalRevenueEth + ' ETH';
      document.getElementById('stat-conversion').textContent = s.conversionRate + '%';
      document.getElementById('stat-total').textContent      = s.totalPayments;
      document.getElementById('stat-confirmed').textContent  = s.confirmedPayments;
      document.getElementById('stat-expired').textContent    = s.expiredPayments;
      document.getElementById('stat-pending').textContent    = s.pendingPayments;
      document.getElementById('net-mainnet-total').textContent     = s.byNetwork.mainnet.total;
      document.getElementById('net-mainnet-confirmed').textContent = s.byNetwork.mainnet.confirmed;
      document.getElementById('net-mainnet-revenue').textContent   = s.byNetwork.mainnet.revenueEth + ' ETH';
      document.getElementById('net-testnet-total').textContent     = s.byNetwork.testnet.total;
      document.getElementById('net-testnet-confirmed').textContent = s.byNetwork.testnet.confirmed;
      document.getElementById('net-testnet-revenue').textContent   = s.byNetwork.testnet.revenueEth + ' ETH';
    }

    if (volumeRes.success) renderVolumeChart(volumeRes.data);
  }

  function renderVolumeChart(data) {
    const svg    = document.getElementById('volume-chart');
    const empty  = document.getElementById('chart-empty');
    const counts = data.map(d => d.count);
    const maxVal = Math.max(...counts, 1);

    if (counts.every(c => c === 0)) {
      svg.style.display   = 'none';
      empty.style.display = 'block';
      return;
    }

    svg.style.display   = 'block';
    empty.style.display = 'none';

    const W = 800, H = 140, PAD = { top: 10, right: 10, bottom: 28, left: 32 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const step   = chartW / (data.length - 1 || 1);

    const points = data.map((d, i) => ({
      x: PAD.left + i * step,
      y: PAD.top + chartH - (d.count / maxVal) * chartH,
      d,
    }));

    const linePath = points.map((p, i) => (i === 0 ? \`M\${p.x},\${p.y}\` : \`L\${p.x},\${p.y}\`)).join(' ');
    const areaPath = linePath + \` L\${points[points.length - 1].x},\${PAD.top + chartH} L\${PAD.left},\${PAD.top + chartH} Z\`;

    // Y-axis labels
    const yLabels = [0, Math.ceil(maxVal / 2), maxVal].map(v =>
      \`<text x="\${PAD.left - 6}" y="\${PAD.top + chartH - (v / maxVal) * chartH + 4}" fill="#555" font-size="10" text-anchor="end">\${v}</text>\`
    ).join('');

    // X-axis labels — show first, middle, last
    const xIndices = [0, Math.floor(data.length / 2), data.length - 1];
    const xLabels = xIndices.map(i =>
      \`<text x="\${points[i].x}" y="\${PAD.top + chartH + 18}" fill="#555" font-size="10" text-anchor="middle">\${data[i].date.slice(5)}</text>\`
    ).join('');

    svg.setAttribute('viewBox', \`0 0 \${W} \${H}\`);
    svg.innerHTML = \`
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#3b82f6" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="\${PAD.left}" y1="\${PAD.top}" x2="\${PAD.left}" y2="\${PAD.top + chartH}" stroke="#222" stroke-width="1"/>
      <line x1="\${PAD.left}" y1="\${PAD.top + chartH}" x2="\${PAD.left + chartW}" y2="\${PAD.top + chartH}" stroke="#222" stroke-width="1"/>
      \${yLabels}
      \${xLabels}
      <path d="\${areaPath}" fill="url(#areaGrad)"/>
      <path d="\${linePath}" fill="none" stroke="#3b82f6" stroke-width="2"/>
      \${points.filter(p => p.d.count > 0).map(p =>
        \`<circle cx="\${p.x}" cy="\${p.y}" r="3" fill="#3b82f6">
          <title>\${p.d.date}: \${p.d.count} payment(s), \${p.d.revenueEth} ETH</title>
        </circle>\`
      ).join('')}
    \`;
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  async function loadPayments(page) {
    currentPaymentsPage = page;
    const status  = document.getElementById('filter-status')?.value  || '';
    const network = document.getElementById('filter-network')?.value || '';

    let url = '/payments?page=' + page + '&limit=20';
    if (status)  url += '&status='  + status;
    if (network) url += '&network=' + network;

    const body = await api(url);
    const tbody = document.getElementById('payments-tbody');

    if (!body.success || !body.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">No payments found</td></tr>';
      document.getElementById('payments-page-info').textContent = '';
      document.getElementById('payments-prev').disabled = true;
      document.getElementById('payments-next').disabled = true;
      return;
    }

    const { data: payments, pagination } = body;

    tbody.innerHTML = payments.map(p => \`
      <tr>
        <td class="mono" title="\${p.id}">\${p.id.slice(0, 8)}…</td>
        <td>\${p.amount} ETH</td>
        <td><span class="badge badge-\${p.status.toLowerCase()}">\${p.status}</span></td>
        <td><span class="badge badge-\${p.network.toLowerCase()}">\${p.network}</span></td>
        <td>\${fmt(p.createdAt)}</td>
        <td>\${p.expiresAt ? fmt(p.expiresAt) : '—'}</td>
        <td><a href="/pay/\${p.id}" target="_blank" style="color:#3b82f6;font-size:12px">View page →</a></td>
      </tr>
    \`).join('');

    const total = pagination?.total ?? payments.length;
    const totalPages = Math.ceil(total / (pagination?.limit ?? 20));
    document.getElementById('payments-page-info').textContent = 'Page ' + page + ' of ' + totalPages + ' (' + total + ' total)';
    document.getElementById('payments-prev').disabled = page <= 1;
    document.getElementById('payments-next').disabled = page >= totalPages;
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────

  async function loadWebhooks() {
    const body  = await api('/webhooks');
    const tbody = document.getElementById('webhooks-tbody');

    if (!body.success || !body.data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">No webhooks registered</td></tr>';
      return;
    }

    tbody.innerHTML = body.data.map(w => \`
      <tr>
        <td class="mono" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="\${w.url}">\${w.url}</td>
        <td><span class="badge badge-\${w.isActive ? 'active' : 'inactive'}">\${w.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>\${fmt(w.createdAt)}</td>
        <td style="display:flex;gap:8px">
          <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" onclick="loadDeliveries('\${w.id}')">Deliveries</button>
          <button class="btn btn-danger" style="padding:4px 10px;font-size:12px" onclick="deleteWebhook('\${w.id}')">Revoke</button>
        </td>
      </tr>
    \`).join('');
  }

  async function loadDeliveries(webhookId) {
    selectedWebhookId = webhookId;
    const body  = await api('/webhooks/' + webhookId + '/deliveries');
    const tbody = document.getElementById('deliveries-tbody');
    document.getElementById('deliveries-section').style.display = 'block';

    if (!body.success || !body.data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No deliveries yet</td></tr>';
      return;
    }

    tbody.innerHTML = body.data.map(d => \`
      <tr>
        <td class="mono">\${d.paymentId.slice(0, 8)}…</td>
        <td><span class="badge badge-\${d.status.toLowerCase()}">\${d.status}</span></td>
        <td>\${d.responseCode ?? '—'} \${d.responseBody ? '· ' + d.responseBody.slice(0, 40) : ''}</td>
        <td>\${d.attemptCount}</td>
        <td>\${d.nextRetryAt ? fmt(d.nextRetryAt) : '—'}</td>
        <td>\${fmt(d.createdAt)}</td>
      </tr>
    \`).join('');
  }

  async function createWebhook() {
    const url = document.getElementById('webhook-url-input').value.trim();
    document.getElementById('webhook-error').textContent = '';

    if (!url) { document.getElementById('webhook-error').textContent = 'URL is required'; return; }

    const body = await api('/webhooks', { method: 'POST', body: JSON.stringify({ url }) });

    if (!body.success) {
      document.getElementById('webhook-error').textContent = body.error || 'Failed';
      return;
    }

    closeModal('modal-webhook');

    document.getElementById('webhook-secret-content').innerHTML = \`
      <div class="key-reveal">
        <div class="key-label">Signing Secret</div>
        <div class="key-value">\${body.data.secret}</div>
      </div>
      <p style="font-size:12px;color:#666;margin-top:8px">Use this to verify the <code>X-Webhook-Signature</code> header on incoming requests.</p>
    \`;
    document.getElementById('modal-webhook-secret').style.display = 'flex';
  }

  async function deleteWebhook(id) {
    if (!confirm('Revoke this webhook? It will stop receiving deliveries.')) return;
    await api('/webhooks/' + id, { method: 'DELETE' });
    loadWebhooks();
  }

  // ── API Keys ──────────────────────────────────────────────────────────────

  async function loadApiKeys() {
    const body  = await api('/api-keys');
    const tbody = document.getElementById('apikeys-tbody');

    if (!body.success || !body.data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No API keys yet</td></tr>';
      return;
    }

    tbody.innerHTML = body.data.map(k => \`
      <tr>
        <td>\${k.name}</td>
        <td class="mono">\${k.keyPrefix}…</td>
        <td><span class="badge badge-\${k.type.toLowerCase()}">\${k.type}</span></td>
        <td>\${k.lastUsedAt ? fmt(k.lastUsedAt) : 'Never'}</td>
        <td><span class="badge badge-\${k.isActive ? 'active' : 'inactive'}">\${k.isActive ? 'Active' : 'Revoked'}</span></td>
        <td>\${k.isActive ? '<button class="btn btn-danger" style="padding:4px 10px;font-size:12px" onclick="revokeKey(\\''+k.id+'\\')">Revoke</button>' : ''}</td>
      </tr>
    \`).join('');
  }

  async function generateKeyPair() {
    const name = document.getElementById('apikey-name-input').value.trim();
    const mode = document.getElementById('apikey-mode-input').value;
    document.getElementById('apikey-error').textContent = '';

    if (!name) { document.getElementById('apikey-error').textContent = 'Name is required'; return; }

    const body = await api('/api-keys', { method: 'POST', body: JSON.stringify({ name, mode }) });

    if (!body.success) {
      document.getElementById('apikey-error').textContent = body.error || 'Failed';
      return;
    }

    closeModal('modal-apikey');

    const { secretKey, publishableKey } = body.data;
    document.getElementById('key-reveal-content').innerHTML = \`
      <div class="key-reveal">
        <div class="key-label">Secret Key</div>
        <div class="key-value">\${secretKey.fullKey}</div>
      </div>
      <div class="key-reveal">
        <div class="key-label">Publishable Key</div>
        <div class="key-value">\${publishableKey.fullKey}</div>
      </div>
    \`;
    document.getElementById('modal-apikey-reveal').style.display = 'flex';
  }

  async function revokeKey(id) {
    if (!confirm('Revoke this key? Requests using it will immediately fail.')) return;
    await api('/api-keys/' + id, { method: 'DELETE' });
    loadApiKeys();
  }

  // ── Account ───────────────────────────────────────────────────────────────

  async function loadAccount() {
    const body = await api('/account');
    if (!body.success) return;

    const { email, payoutAddress, createdAt } = body.data;
    const emailEl = document.getElementById('account-email');
    const createdEl = document.getElementById('account-created');
    const payoutEl = document.getElementById('payout-address-input');
    const userEmailEl = document.getElementById('user-email-display');

    if (emailEl) emailEl.value = email;
    if (createdEl) createdEl.value = fmt(createdAt);
    if (payoutEl) payoutEl.value = payoutAddress || '';
    if (userEmailEl) userEmailEl.textContent = email;
  }

  async function savePayoutAddress() {
    const payoutAddress = document.getElementById('payout-address-input').value.trim();
    const errEl = document.getElementById('payout-error');
    const successEl = document.getElementById('payout-success');

    errEl.textContent = '';
    successEl.style.display = 'none';

    const body = await api('/account/payout-address', {
      method: 'PATCH',
      body: JSON.stringify({ payoutAddress }),
    });

    if (!body.success) {
      errEl.textContent = body.error || 'Failed to save';
      return;
    }

    successEl.style.display = 'inline';
    setTimeout(() => { successEl.style.display = 'none'; }, 3000);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  let currentAdminUsersPage = 1;
  let currentAdminPaymentsPage = 1;

  function switchAdminTab(tab) {
    document.querySelectorAll('#tab-admin .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('[id^="atab-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('admin-tab-' + tab).classList.add('active');
    document.getElementById('atab-' + tab).classList.add('active');
    if (tab === 'users')    loadAdminUsers(1);
    if (tab === 'payments') loadAdminPayments(1);
    if (tab === 'sweeps')   loadAdminFailedSweeps();
  }

  async function loadAdminUsers(page) {
    currentAdminUsersPage = page;
    const body  = await api('/admin/users?page=' + page + '&limit=20');
    const tbody = document.getElementById('admin-users-tbody');

    if (!body.success || !body.data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">No users found</td></tr>';
      document.getElementById('admin-users-page-info').textContent = '';
      document.getElementById('admin-users-prev').disabled = true;
      document.getElementById('admin-users-next').disabled = true;
      return;
    }

    tbody.innerHTML = body.data.map(u => \`
      <tr>
        <td>\${u.email}</td>
        <td class="mono" style="font-size:11px">\${u.payoutAddress ?? '<span style="color:#555">not set</span>'}</td>
        <td>\${u.isAdmin ? '<span class="badge badge-secret">Admin</span>' : '<span class="badge badge-inactive">Merchant</span>'}</td>
        <td>\${fmt(u.createdAt)}</td>
      </tr>
    \`).join('');

    const total      = body.pagination?.total ?? body.data.length;
    const totalPages = Math.ceil(total / (body.pagination?.limit ?? 20));
    document.getElementById('admin-users-page-info').textContent = 'Page ' + page + ' of ' + totalPages + ' (' + total + ' total)';
    document.getElementById('admin-users-prev').disabled = page <= 1;
    document.getElementById('admin-users-next').disabled = page >= totalPages;
  }

  async function loadAdminPayments(page) {
    currentAdminPaymentsPage = page;
    const status = document.getElementById('admin-filter-status')?.value || '';
    let url = '/admin/payments?page=' + page + '&limit=20';
    if (status) url += '&status=' + status;

    const body  = await api(url);
    const tbody = document.getElementById('admin-payments-tbody');

    if (!body.success || !body.data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No payments found</td></tr>';
      document.getElementById('admin-payments-page-info').textContent = '';
      document.getElementById('admin-payments-prev').disabled = true;
      document.getElementById('admin-payments-next').disabled = true;
      return;
    }

    tbody.innerHTML = body.data.map(p => \`
      <tr>
        <td style="font-size:12px">\${p.merchantEmail}</td>
        <td>\${p.amount} ETH</td>
        <td><span class="badge badge-\${p.status.toLowerCase()}">\${p.status}</span></td>
        <td><span class="badge badge-\${p.network.toLowerCase()}">\${p.network}</span></td>
        <td>\${fmt(p.createdAt)}</td>
      </tr>
    \`).join('');

    const total      = body.pagination?.total ?? body.data.length;
    const totalPages = Math.ceil(total / (body.pagination?.limit ?? 20));
    document.getElementById('admin-payments-page-info').textContent = 'Page ' + page + ' of ' + totalPages + ' (' + total + ' total)';
    document.getElementById('admin-payments-prev').disabled = page <= 1;
    document.getElementById('admin-payments-next').disabled = page >= totalPages;
  }

  async function loadAdminFailedSweeps() {
    const body  = await api('/admin/sweeps/failed');
    const tbody = document.getElementById('admin-sweeps-tbody');

    if (!body.success || !body.data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No failed sweeps</td></tr>';
      return;
    }

    tbody.innerHTML = body.data.map(s => \`
      <tr>
        <td style="font-size:12px">\${s.merchantEmail}</td>
        <td class="mono" style="font-size:11px" title="\${s.paymentId}">\${s.paymentId.slice(0, 8)}…</td>
        <td>\${s.amount} ETH</td>
        <td><span class="badge badge-\${s.network.toLowerCase()}">\${s.network}</span></td>
        <td style="color:#fca5a5;font-size:12px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="\${s.errorMessage ?? ''}">\${s.errorMessage ?? '—'}</td>
        <td>\${fmt(s.createdAt)}</td>
      </tr>
    \`).join('');
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openNewWebhookModal() {
    document.getElementById('webhook-url-input').value = '';
    document.getElementById('webhook-error').textContent = '';
    document.getElementById('modal-webhook').style.display = 'flex';
  }

  function openGenerateKeyModal() {
    document.getElementById('apikey-name-input').value = '';
    document.getElementById('apikey-error').textContent = '';
    document.getElementById('modal-apikey').style.display = 'flex';
  }

  function closeModal(id) {
    document.getElementById(id).style.display = 'none';
  }

  // ── Utils ─────────────────────────────────────────────────────────────────

  function fmt(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  document.getElementById('login-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-password').focus();
  });

  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  token = localStorage.getItem('cgw_token');
  if (token) {
    showDashboard();
  }
</script>
</body>
</html>`;
